<?php
/**
 * Script de Diagnóstico e Verificação de Conexão MySQL
 * Permite validar a integridade da base de dados tanto no Laragon quanto no cPanel
 * Plataforma MEGASON — Desenvolvido por Zedecks IT
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';

try {
    $db = getDbConnection();
    
    // Versão do MySQL / MariaDB
    $versionStmt = $db->query("SELECT VERSION() as v");
    $version = $versionStmt->fetchColumn();

    // Verificação das 5 tabelas obrigatórias
    $expectedTables = ['users', 'subscriptions', 'invoices', 'plans', 'settings'];
    $tableCounts = [];
    $allTablesExist = true;

    foreach ($expectedTables as $table) {
        try {
            $stmt = $db->query("SELECT COUNT(*) FROM `{$table}`");
            $count = (int)$stmt->fetchColumn();
            $tableCounts[$table] = [
                'exists' => true,
                'total_rows' => $count
            ];
        } catch (Exception $tblErr) {
            $allTablesExist = false;
            $tableCounts[$table] = [
                'exists' => false,
                'total_rows' => 0,
                'error' => $tblErr->getMessage()
            ];
        }
    }

    // Consulta admin padrão
    $adminExists = false;
    try {
        $admStmt = $db->query("SELECT id, client_code, full_name, email, role FROM users WHERE role = 'admin' LIMIT 1");
        $admin = $admStmt->fetch();
        if ($admin) {
            $adminExists = true;
        }
    } catch (Exception $e) {}

    sendJsonResponse([
        'status'         => 'success',
        'message'        => 'Base de dados conectada e operacional!',
        'database_name'  => DB_NAME,
        'database_host'  => DB_HOST,
        'mysql_version'  => $version,
        'all_tables_ok'  => $allTablesExist,
        'admin_seeded'   => $adminExists,
        'tables_summary' => $tableCounts,
        'timestamp'      => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    sendJsonResponse([
        'status'        => 'error',
        'message'       => 'Falha ao conectar com a base de dados MySQL.',
        'details'       => $e->getMessage(),
        'database_name' => DB_NAME,
        'database_host' => DB_HOST,
        'instructions'  => [
            'laragon' => 'Certifique-se de que o Laragon está aberto com o botão "Start All" ativado e o serviço MySQL rodando na porta 3306.',
            'cpanel'  => 'Verifique as credenciais no arquivo api/config/db.php (DB_NAME, DB_USER, DB_PASS) e se o utilizador possui ALL PRIVILEGES atribuídos no cPanel.'
        ],
        'timestamp'     => date('Y-m-d H:i:s')
    ], 500);
}
