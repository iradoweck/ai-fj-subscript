<?php
/**
 * Conexão com a Base de Dados MySQL / MariaDB via PDO
 * Suporta cPanel (Produção) e Laragon / XAMPP (Desenvolvimento Local)
 * Plataforma MEGASON — Desenvolvido por Zedecks IT
 */

// Carrega arquivo .env local se existir
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim(trim($val), '"\'');
            if (!isset($_SERVER[$key]) && !isset($_ENV[$key])) {
                putenv("{$key}={$val}");
                $_ENV[$key] = $val;
            }
        }
    }
}

// Configurações da Base de Dados
// Padrão do Laragon: Host 127.0.0.1, Porta 3306, User root, Pass "" (vazia)
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'megason_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

/**
 * Retorna a instância única de conexão PDO com o MySQL
 * Possui auto-recuperação e suporte automático para Laragon / XAMPP
 * @return PDO
 * @throws PDOException
 */
function getDbConnection(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        // 1. Primeira tentativa com as credenciais configuradas
        try {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Se o erro for de banco inexistente (Unknown database), tenta criar automaticamente
            if ($e->getCode() == 1049 || strpos($e->getMessage(), 'Unknown database') !== false) {
                try {
                    $serverDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
                    $serverPdo = new PDO($serverDsn, DB_USER, DB_PASS, $options);
                    $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    
                    // Conecta no banco recém-criado
                    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                    
                    // Executa o schema.sql inicial se existir
                    $schemaPath = __DIR__ . '/../../database/schema.sql';
                    if (file_exists($schemaPath)) {
                        $sql = file_get_contents($schemaPath);
                        $pdo->exec($sql);
                    }
                    return $pdo;
                } catch (Exception $innerErr) {
                    error_log("Falha na auto-criação do banco no Laragon: " . $innerErr->getMessage());
                }
            }

            // 2. Se falhar por autenticação e não for root, tenta o padrão do Laragon (root sem senha)
            if (DB_USER !== 'root') {
                try {
                    $laragonDsn = "mysql:host=127.0.0.1;port=3306;dbname=" . DB_NAME . ";charset=utf8mb4";
                    $pdo = new PDO($laragonDsn, 'root', '', $options);
                    return $pdo;
                } catch (PDOException $eLaragon) {
                    // Se o banco não existir no Laragon, tenta criar via root
                    if ($eLaragon->getCode() == 1049 || strpos($eLaragon->getMessage(), 'Unknown database') !== false) {
                        try {
                            $serverPdo = new PDO("mysql:host=127.0.0.1;port=3306;charset=utf8mb4", 'root', '', $options);
                            $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                            $pdo = new PDO($laragonDsn, 'root', '', $options);
                            
                            $schemaPath = __DIR__ . '/../../database/schema.sql';
                            if (file_exists($schemaPath)) {
                                $sql = file_get_contents($schemaPath);
                                $pdo->exec($sql);
                            }
                            return $pdo;
                        } catch (Exception $eCreate) {}
                    }
                }
            }

            // Log técnico do erro
            error_log("Erro de conexão com o banco de dados MySQL: " . $e->getMessage());
            throw new Exception("Falha ao conectar com o MySQL do Laragon/cPanel: " . $e->getMessage() . ". Certifique-se de que o Laragon está em execução ('Start All') e o MySQL ativo na porta 3306.");
        }
    }

    return $pdo;
}
