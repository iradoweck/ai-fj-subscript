<?php
/**
 * Endpoint de Gestão Completa de Clientes
 * Suporta consulta consolidada, edição de ficha cadastral e eliminação em cascata
 * Plataforma MEGASON — Desenvolvido por Zedecks IT
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';

$action = $_GET['action'] ?? 'list';
$data = getRequestJson();

try {
    $db = getDbConnection();

    switch ($action) {
        // ----------------------------------------------------------------------
        // LISTAGEM CONSOLIDADA DE CLIENTES (Para a tabela executiva de 13 colunas)
        // ----------------------------------------------------------------------
        case 'list': {
            // Busca todos os clientes
            $usersStmt = $db->query("
                SELECT id, client_code, full_name, email, whatsapp_number, province, folder_name, access_credentials, admin_notes, status, created_at
                FROM users 
                WHERE role = 'customer'
                ORDER BY created_at DESC
            ");
            $users = $usersStmt->fetchAll();

            $customers = [];
            foreach ($users as $u) {
                // Busca a subscrição ativa mais recente
                $subStmt = $db->prepare("
                    SELECT * 
                    FROM subscriptions 
                    WHERE user_id = ? OR customer_email = ?
                    ORDER BY 
                      CASE 
                        WHEN status = 'active' THEN 1 
                        WHEN status = 'pending' THEN 2 
                        WHEN status = 'suspended' THEN 3 
                        ELSE 4 
                      END, 
                      created_at DESC 
                    LIMIT 1
                ");
                $subStmt->execute([$u['id'], $u['email']]);
                $activeSub = $subStmt->fetch() ?: null;

                // Agrega totais de faturas do cliente
                $invStmt = $db->prepare("
                    SELECT 
                        COUNT(*) as total_invoices,
                        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid
                    FROM invoices
                    WHERE user_id = ? OR customer_email = ?
                ");
                $invStmt->execute([$u['id'], $u['email']]);
                $invAgg = $invStmt->fetch();

                $customers[] = [
                    'id'                 => $u['id'],
                    'clientCode'         => $u['client_code'],
                    'fullName'           => $u['full_name'],
                    'name'               => $u['full_name'],
                    'email'              => $u['email'],
                    'whatsappNumber'     => $u['whatsapp_number'],
                    'whatsapp'           => $u['whatsapp_number'],
                    'province'           => $u['province'] ?: 'Maputo Cidade',
                    'folderName'         => $u['folder_name'] ?: ($activeSub['folder_name'] ?? 'Não atribuída'),
                    'accessCredentials'  => $u['access_credentials'] ?: ($activeSub['access_credentials'] ?? ''),
                    'adminNotes'         => $u['admin_notes'] ?: ($activeSub['admin_notes'] ?? ''),
                    'status'             => $activeSub ? $activeSub['status'] : 'none',
                    'activeSubscription' => $activeSub,
                    'invoicesCount'      => (int) ($invAgg['total_invoices'] ?? 0),
                    'totalPaid'          => (float) ($invAgg['total_paid'] ?? 0.00),
                    'createdAt'          => $u['created_at']
                ];
            }

            sendJsonResponse([
                'success' => true,
                'customers' => $customers
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // ATUALIZAÇÃO DA FICHA CADASTRAL DO CLIENTE
        // ----------------------------------------------------------------------
        case 'update': {
            $userId = trim($data['userId'] ?? '');
            $customerEmail = strtolower(trim($data['customerEmail'] ?? ''));
            $fullName = trim($data['fullName'] ?? '');
            $whatsapp = trim($data['whatsappNumber'] ?? '');
            $province = trim($data['province'] ?? 'Maputo Cidade');
            $folderName = trim($data['folderName'] ?? '');
            $accessCredentials = trim($data['accessCredentials'] ?? '');
            $adminNotes = trim($data['adminNotes'] ?? '');

            if (empty($fullName) || empty($whatsapp)) {
                sendJsonResponse(['error' => 'Nome e contacto de WhatsApp são obrigatórios.'], 400);
            }

            $db->beginTransaction();

            // 1. Atualiza na tabela users
            $upUser = $db->prepare("
                UPDATE users SET
                    full_name = ?,
                    whatsapp_number = ?,
                    province = ?,
                    folder_name = ?,
                    access_credentials = ?,
                    admin_notes = ?
                WHERE id = ? OR email = ?
            ");
            $upUser->execute([$fullName, $whatsapp, $province, $folderName, $accessCredentials, $adminNotes, $userId, $customerEmail]);

            // 2. Propaga nome, whatsapp e pasta nas subscrições existentes do cliente
            $upSub = $db->prepare("
                UPDATE subscriptions SET
                    customer_name = ?,
                    customer_whatsapp = ?,
                    folder_name = COALESCE(NULLIF(?, ''), folder_name),
                    access_credentials = COALESCE(NULLIF(?, ''), access_credentials),
                    admin_notes = COALESCE(NULLIF(?, ''), admin_notes)
                WHERE user_id = ? OR customer_email = ?
            ");
            $upSub->execute([$fullName, $whatsapp, $folderName, $accessCredentials, $adminNotes, $userId, $customerEmail]);

            // 3. Propaga nome e whatsapp nas faturas existentes
            $upInv = $db->prepare("
                UPDATE invoices SET
                    customer_name = ?,
                    customer_whatsapp = ?
                WHERE user_id = ? OR customer_email = ?
            ");
            $upInv->execute([$fullName, $whatsapp, $userId, $customerEmail]);

            $db->commit();

            sendJsonResponse([
                'success' => true,
                'message' => 'Ficha cadastral do cliente atualizada com sucesso.'
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // ELIMINAÇÃO EM CASCATA (Cliente, Subscrições e Faturas)
        // ----------------------------------------------------------------------
        case 'delete': {
            $userId = trim($data['userId'] ?? '');
            $customerEmail = strtolower(trim($data['customerEmail'] ?? ''));

            if (empty($userId) && empty($customerEmail)) {
                sendJsonResponse(['error' => 'Identificador do cliente ou e-mail é obrigatório para exclusão.'], 400);
            }

            // A chave estrangeira ON DELETE CASCADE na tabela subscriptions e invoices
            // garante a eliminação de tudo o que lhe relaciona automaticamente!
            $stmt = $db->prepare("DELETE FROM users WHERE id = ? OR email = ?");
            $stmt->execute([$userId, $customerEmail]);

            sendJsonResponse([
                'success' => true,
                'message' => 'Cliente e todo o histórico associado eliminados com sucesso.'
            ]);
            break;
        }

        default:
            sendJsonResponse(['error' => 'Ação de clientes não reconhecida.'], 400);
    }
} catch (Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    sendJsonResponse(['error' => $e->getMessage()], 500);
}
