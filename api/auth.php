<?php
/**
 * Endpoint de Autenticação e Gestão de Perfil de Utilizadores
 * Suporta Login de Clientes e Administradores, Registo e Alteração de Senhas
 * Plataforma MEGASON — Desenvolvido por Zedecks IT
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';

$action = $_GET['action'] ?? '';
$data = getRequestJson();

try {
    $db = getDbConnection();

    switch ($action) {
        // ----------------------------------------------------------------------
        // LOGIN (Clientes & Administradores)
        // ----------------------------------------------------------------------
        case 'login': {
            $email = trim($data['email'] ?? '');
            $password = $data['password'] ?? '';

            if (empty($email) || empty($password)) {
                sendJsonResponse(['error' => 'Por favor, informe o seu e-mail e palavra-passe.'], 400);
            }

            $cleanEmail = strtolower($email);

            // Provisionamento e garantia imediata para admin@admin-megason.site com senha 123456
            if (in_array($cleanEmail, ['admin@admin-megason.site', 'comercial@admin-megason.site']) && $password === '123456') {
                $checkAdm = $db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
                $checkAdm->execute([$cleanEmail]);
                $admUser = $checkAdm->fetch();

                $hash123 = password_hash('123456', PASSWORD_BCRYPT);

                if (!$admUser) {
                    $insAdm = $db->prepare("
                        INSERT INTO users (id, client_code, full_name, email, whatsapp_number, province, password_hash, role, role_title, status)
                        VALUES ('usr_admin_megason', 'AI-ADMIN', 'Administrador Geral MEGASON', ?, '842256366', 'Maputo Cidade', ?, 'admin', 'Administrador Geral & Operações', 'active')
                        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', status = 'active'
                    ");
                    $insAdm->execute([$cleanEmail, $hash123]);

                    $checkAdm->execute([$cleanEmail]);
                    $admUser = $checkAdm->fetch();
                } else {
                    $updAdm = $db->prepare("UPDATE users SET password_hash = ?, role = 'admin', status = 'active' WHERE id = ?");
                    $updAdm->execute([$hash123, $admUser['id']]);
                }

                unset($admUser['password_hash']);
                sendJsonResponse([
                    'success' => true,
                    'user'    => $admUser,
                    'isAdmin' => true
                ]);
            }

            $stmt = $db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
            $stmt->execute([$cleanEmail]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password_hash'])) {
                sendJsonResponse(['error' => 'Credenciais de acesso incorretas. Verifique o seu e-mail e palavra-passe.'], 401);
            }

            if ($user['status'] !== 'active') {
                sendJsonResponse(['error' => 'Esta conta encontra-se inativa. Contacte o suporte da MEGASON.'], 403);
            }

            // Remove o hash de senha antes de responder
            unset($user['password_hash']);

            sendJsonResponse([
                'success' => true,
                'user'    => $user,
                'isAdmin' => ($user['role'] === 'admin')
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // REGISTO DE NOVO CLIENTE
        // ----------------------------------------------------------------------
        case 'register': {
            $fullName = trim($data['fullName'] ?? '');
            $email = strtolower(trim($data['email'] ?? ''));
            $whatsapp = trim($data['whatsappNumber'] ?? '');
            $province = trim($data['province'] ?? 'Maputo Cidade');
            $password = $data['password'] ?? '';

            if (empty($fullName) || empty($email) || empty($whatsapp) || empty($password)) {
                sendJsonResponse(['error' => 'Todos os campos obrigatórios devem ser preenchidos.'], 400);
            }

            if (strlen($password) < 6) {
                sendJsonResponse(['error' => 'A palavra-passe deve conter pelo menos 6 caracteres.'], 400);
            }

            // Verifica se o e-mail já existe
            $checkStmt = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            $checkStmt->execute([$email]);
            if ($checkStmt->fetch()) {
                sendJsonResponse(['error' => 'Já existe uma conta registada com este endereço de e-mail.'], 409);
            }

            // Gera código AI-XXXX único
            $clientCode = '';
            for ($attempt = 0; $attempt < 10; $attempt++) {
                $candidate = generateClientCode();
                $cStmt = $db->prepare("SELECT id FROM users WHERE client_code = ? LIMIT 1");
                $cStmt->execute([$candidate]);
                if (!$cStmt->fetch()) {
                    $clientCode = $candidate;
                    break;
                }
            }
            if (!$clientCode) $clientCode = 'AI-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

            $userId = generateUuid('usr');
            $passwordHash = password_hash($password, PASSWORD_BCRYPT);
            $firstName = explode(' ', $fullName)[0];
            $folderName = "MEGASON - {$firstName}";

            $insStmt = $db->prepare("
                INSERT INTO users (id, client_code, full_name, email, whatsapp_number, province, password_hash, role, role_title, folder_name, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'customer', 'Cliente', ?, 'active')
            ");
            $insStmt->execute([$userId, $clientCode, $fullName, $email, $whatsapp, $province, $passwordHash, $folderName]);

            sendJsonResponse([
                'success' => true,
                'user' => [
                    'id'              => $userId,
                    'client_code'     => $clientCode,
                    'full_name'       => $fullName,
                    'email'           => $email,
                    'whatsapp_number' => $whatsapp,
                    'province'        => $province,
                    'role'            => 'customer',
                    'folder_name'     => $folderName,
                    'status'          => 'active'
                ]
            ], 201);
            break;
        }

        // ----------------------------------------------------------------------
        // DADOS DO PERFIL ATUAL
        // ----------------------------------------------------------------------
        case 'me': {
            $userId = trim($_GET['uid'] ?? $data['uid'] ?? '');
            if (empty($userId)) {
                sendJsonResponse(['error' => 'Identificador do utilizador não fornecido.'], 400);
            }

            $stmt = $db->prepare("SELECT * FROM users WHERE id = ? OR email = ? LIMIT 1");
            $stmt->execute([$userId, $userId]);
            $user = $stmt->fetch();

            if (!$user) {
                sendJsonResponse(['error' => 'Utilizador não encontrado.'], 404);
            }

            unset($user['password_hash']);
            sendJsonResponse([
                'success' => true,
                'user'    => $user,
                'isAdmin' => ($user['role'] === 'admin')
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // ATUALIZAÇÃO DO PERFIL DO ADMINISTRADOR / CLIENTE
        // ----------------------------------------------------------------------
        case 'update-profile': {
            $userId = trim($data['uid'] ?? '');
            $fullName = trim($data['fullName'] ?? '');
            $whatsapp = trim($data['whatsappNumber'] ?? '');
            $roleTitle = trim($data['roleTitle'] ?? '');

            if (empty($fullName) || empty($whatsapp)) {
                sendJsonResponse(['error' => 'Nome e contacto de WhatsApp são obrigatórios.'], 400);
            }

            $stmt = $db->prepare("
                UPDATE users 
                SET full_name = ?, whatsapp_number = ?, role_title = COALESCE(NULLIF(?, ''), role_title)
                WHERE id = ? OR role = 'admin'
                LIMIT 1
            ");
            $stmt->execute([$fullName, $whatsapp, $roleTitle, $userId]);

            sendJsonResponse([
                'success' => true,
                'message' => 'Perfil atualizado com sucesso.',
                'profile' => [
                    'fullName'       => $fullName,
                    'whatsappNumber' => $whatsapp,
                    'roleTitle'      => $roleTitle
                ]
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // ALTERAÇÃO DE PALAVRA-PASSE
        // ----------------------------------------------------------------------
        case 'change-password': {
            $userId = trim($data['uid'] ?? '');
            $newPassword = $data['newPassword'] ?? '';

            if (strlen($newPassword) < 6) {
                sendJsonResponse(['error' => 'A nova palavra-passe deve conter pelo menos 6 caracteres.'], 400);
            }

            $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE id = ? OR role = 'admin' LIMIT 1");
            $stmt->execute([$newHash, $userId]);

            sendJsonResponse([
                'success' => true,
                'message' => 'Palavra-passe alterada com sucesso.'
            ]);
            break;
        }

        default:
            sendJsonResponse(['error' => 'Ação de autenticação não reconhecida.'], 400);
    }
} catch (Exception $e) {
    sendJsonResponse(['error' => $e->getMessage()], 500);
}
