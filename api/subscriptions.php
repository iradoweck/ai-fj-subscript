<?php
/**
 * Endpoint de Gestão de Pedidos e Subscrições
 * Implementa a matemática oficial de vigência, conferência de SMS e aprovações
 * Plataforma MEGASON — Desenvolvido por Zedecks IT
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/invoices.php'; // Para reutilizar getNextInvoiceSequence()

$action = $_GET['action'] ?? 'list';
$data = getRequestJson();

/**
 * Calcula as datas oficiais de vigência (Início, Fim e Dias Restantes)
 * Aplica a regra de negócio estrita: se houver vigência ativa, SOMA os dias ao término anterior!
 */
function calculateSubscriptionDatesSql(string $currentEndDate = null, int $durationDays = 30): array {
    $now = new DateTime();
    
    // Se o cliente já tem término no futuro, soma ao término anterior
    if ($currentEndDate) {
        $existingEnd = new DateTime($currentEndDate);
        if ($existingEnd > $now) {
            $startDate = $now->format('Y-m-d H:i:s');
            $newEnd = clone $existingEnd;
            $newEnd->modify("+{$durationDays} days");
            return [
                'startDate' => $startDate,
                'endDate'   => $newEnd->format('Y-m-d H:i:s')
            ];
        }
    }

    // Caso contrário (nova ou expirada), inicia a partir de agora
    $startDate = $now->format('Y-m-d H:i:s');
    $end = clone $now;
    $end->modify("+{$durationDays} days");

    return [
        'startDate' => $startDate,
        'endDate'   => $end->format('Y-m-d H:i:s')
    ];
}

try {
    $db = getDbConnection();

    switch ($action) {
        // ----------------------------------------------------------------------
        // LISTAGEM DE SUBSCRIÇÕES
        // ----------------------------------------------------------------------
        case 'list': {
            $userId = $_GET['userId'] ?? null;
            $email = $_GET['email'] ?? null;
            $status = $_GET['status'] ?? 'all';

            $sql = "SELECT * FROM subscriptions WHERE 1=1";
            $params = [];

            if (!empty($userId)) {
                $sql .= " AND user_id = ?";
                $params[] = $userId;
            } elseif (!empty($email)) {
                $sql .= " AND customer_email = ?";
                $params[] = strtolower(trim($email));
            }

            if (!empty($status) && $status !== 'all') {
                $sql .= " AND status = ?";
                $params[] = $status;
            }

            $sql .= " ORDER BY created_at DESC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $subs = $stmt->fetchAll();

            sendJsonResponse([
                'success' => true,
                'subscriptions' => $subs
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // CRIAÇÃO DE PEDIDO COM SMS PELO CLIENTE
        // ----------------------------------------------------------------------
        case 'create': {
            $userId = trim($data['userId'] ?? '');
            $customerName = trim($data['customerName'] ?? 'Cliente');
            $customerEmail = strtolower(trim($data['customerEmail'] ?? ''));
            $customerWhatsapp = trim($data['customerWhatsapp'] ?? '');
            $clientCode = trim($data['clientCode'] ?? '');
            $planId = trim($data['planId'] ?? 'chatgpt-plus-30');
            $planName = trim($data['planName'] ?? 'ChatGPT Plus');
            $price = (float) ($data['price'] ?? 300);
            $durationDays = (int) ($data['durationDays'] ?? 30);
            $paymentMethod = trim($data['paymentMethod'] ?? 'M-Pesa');
            $proofText = trim($data['proofText'] ?? '');

            if (empty($userId) || empty($customerEmail) || empty($customerWhatsapp)) {
                sendJsonResponse(['error' => 'Dados do cliente incompletos para criação do pedido.'], 400);
            }

            if (empty($clientCode)) {
                // Tenta buscar o código do utilizador no banco
                $uStmt = $db->prepare("SELECT client_code FROM users WHERE id = ? LIMIT 1");
                $uStmt->execute([$userId]);
                $clientCode = $uStmt->fetchColumn() ?: generateClientCode();
            }

            $subId = generateUuid('sub');
            $invoiceId = getNextInvoiceSequence($db);

            $db->beginTransaction();

            // Insere o Pedido de Subscrição
            $insSub = $db->prepare("
                INSERT INTO subscriptions (
                    id, user_id, client_code, customer_name, customer_email, customer_whatsapp,
                    plan_id, plan_name, price, currency, duration_days, status, proof_text,
                    latest_invoice_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'MZN', ?, 'pending', ?, ?, NOW())
            ");
            $insSub->execute([
                $subId, $userId, $clientCode, $customerName, $customerEmail, $customerWhatsapp,
                $planId, $planName, $price, $durationDays, $proofText, $invoiceId
            ]);

            // Insere a Fatura Financeira Pendente
            $insInv = $db->prepare("
                INSERT INTO invoices (
                    id, invoice_number, subscription_id, user_id, client_code, customer_name,
                    customer_email, customer_whatsapp, plan_id, plan_name, amount, currency,
                    payment_method, status, proof_text, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MZN', ?, 'pending', ?, NOW())
            ");
            $insInv->execute([
                $invoiceId, $invoiceId, $subId, $userId, $clientCode, $customerName,
                $customerEmail, $customerWhatsapp, $planId, $planName, $price,
                $paymentMethod, $proofText
            ]);

            $db->commit();

            sendJsonResponse([
                'success' => true,
                'subscriptionId' => $subId,
                'invoiceId'      => $invoiceId,
                'message'        => 'Pedido e fatura criados com sucesso. Aguardando conferência.'
            ], 201);
            break;
        }

        // ----------------------------------------------------------------------
        // APROVAÇÃO DO PEDIDO PELO ADMINISTRADOR
        // ----------------------------------------------------------------------
        case 'approve': {
            $subscriptionId = trim($data['subscriptionId'] ?? '');
            $invoiceId = trim($data['invoiceId'] ?? '');
            $folderName = trim($data['folderName'] ?? '');
            $accessCredentials = trim($data['accessCredentials'] ?? '');
            $adminUid = trim($data['adminUid'] ?? 'Admin MEGASON');

            if (empty($subscriptionId)) {
                sendJsonResponse(['error' => 'Identificador da subscrição é obrigatório.'], 400);
            }

            // Busca a subscrição para ver histórico de vigência anterior do cliente
            $stmt = $db->prepare("SELECT * FROM subscriptions WHERE id = ? LIMIT 1");
            $stmt->execute([$subscriptionId]);
            $sub = $stmt->fetch();

            if (!$sub) {
                sendJsonResponse(['error' => 'Subscrição não encontrada.'], 404);
            }

            // Verifica se o mesmo cliente possui outra subscrição ativa com término futuro
            $activeStmt = $db->prepare("
                SELECT end_date 
                FROM subscriptions 
                WHERE (user_id = ? OR customer_email = ?) 
                  AND status = 'active' 
                  AND end_date > NOW() 
                ORDER BY end_date DESC 
                LIMIT 1
            ");
            $activeStmt->execute([$sub['user_id'], $sub['customer_email']]);
            $activeEndDate = $activeStmt->fetchColumn() ?: $sub['end_date'];

            $dates = calculateSubscriptionDatesSql($activeEndDate, (int)$sub['duration_days']);

            $finalFolder = !empty($folderName) ? $folderName : ($sub['folder_name'] ?: "MEGASON - " . explode(' ', $sub['customer_name'])[0]);
            $finalCreds = !empty($accessCredentials) ? $accessCredentials : ($sub['access_credentials'] ?: "Acesso liberado via pasta dedicada.");

            $db->beginTransaction();

            // Atualiza a subscrição para ativa
            $upSub = $db->prepare("
                UPDATE subscriptions SET
                    status = 'active',
                    folder_name = ?,
                    access_credentials = ?,
                    start_date = ?,
                    end_date = ?,
                    approved_at = NOW(),
                    approved_by = ?
                WHERE id = ?
            ");
            $upSub->execute([
                $finalFolder, $finalCreds, $dates['startDate'], $dates['endDate'],
                $adminUid, $subscriptionId
            ]);

            // Sincroniza a pasta no utilizador
            $upUser = $db->prepare("UPDATE users SET folder_name = ? WHERE id = ? OR email = ?");
            $upUser->execute([$finalFolder, $sub['user_id'], $sub['customer_email']]);

            // Atualiza a fatura para paga
            $targetInvoiceId = !empty($invoiceId) ? $invoiceId : $sub['latest_invoice_id'];
            if ($targetInvoiceId) {
                $upInv = $db->prepare("
                    UPDATE invoices SET
                        status = 'paid',
                        paid_at = NOW(),
                        confirmed_by = ?
                    WHERE id = ? OR invoice_number = ?
                ");
                $upInv->execute([$adminUid, $targetInvoiceId, $targetInvoiceId]);
            }

            $db->commit();

            sendJsonResponse([
                'success'   => true,
                'startDate' => $dates['startDate'],
                'endDate'   => $dates['endDate'],
                'message'   => 'Subscrição aprovada e fatura liquidada com sucesso.'
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // SUSPENSÃO DE SUBSCRIÇÃO
        // ----------------------------------------------------------------------
        case 'suspend': {
            $subscriptionId = trim($data['subscriptionId'] ?? '');
            $reason = trim($data['reason'] ?? 'Suspensão administrativa');

            if (empty($subscriptionId)) {
                sendJsonResponse(['error' => 'Identificador da subscrição é obrigatório.'], 400);
            }

            $stmt = $db->prepare("
                UPDATE subscriptions 
                SET status = 'suspended', admin_notes = CONCAT(COALESCE(admin_notes, ''), ' | Suspenso: ', ?)
                WHERE id = ?
            ");
            $stmt->execute([$reason, $subscriptionId]);

            sendJsonResponse(['success' => true, 'message' => 'Subscrição suspensa.']);
            break;
        }

        // ----------------------------------------------------------------------
        // REATIVAÇÃO DE SUBSCRIÇÃO
        // ----------------------------------------------------------------------
        case 'reactivate': {
            $subscriptionId = trim($data['subscriptionId'] ?? '');
            if (empty($subscriptionId)) {
                sendJsonResponse(['error' => 'Identificador da subscrição é obrigatório.'], 400);
            }

            $stmt = $db->prepare("UPDATE subscriptions SET status = 'active' WHERE id = ?");
            $stmt->execute([$subscriptionId]);

            sendJsonResponse(['success' => true, 'message' => 'Subscrição reativada.']);
            break;
        }

        // ----------------------------------------------------------------------
        // CANCELAMENTO / REJEIÇÃO DE PEDIDO
        // ----------------------------------------------------------------------
        case 'cancel': {
            $subscriptionId = trim($data['subscriptionId'] ?? '');
            $reason = trim($data['reason'] ?? 'Comprovativo não confirmado');

            if (empty($subscriptionId)) {
                sendJsonResponse(['error' => 'Identificador da subscrição é obrigatório.'], 400);
            }

            $db->beginTransaction();
            $upSub = $db->prepare("UPDATE subscriptions SET status = 'cancelled', admin_notes = ? WHERE id = ?");
            $upSub->execute([$reason, $subscriptionId]);

            $upInv = $db->prepare("UPDATE invoices SET status = 'cancelled' WHERE subscription_id = ?");
            $upInv->execute([$subscriptionId]);
            $db->commit();

            sendJsonResponse(['success' => true, 'message' => 'Pedido e fatura cancelados.']);
            break;
        }

        // ----------------------------------------------------------------------
        // ATRIBUIÇÃO DIRETA DE PACOTE PELO ADMINISTRADOR
        // ----------------------------------------------------------------------
        case 'assign-plan': {
            $userId = trim($data['userId'] ?? '');
            $customerEmail = strtolower(trim($data['customerEmail'] ?? ''));
            $customerName = trim($data['customerName'] ?? 'Cliente');
            $customerWhatsapp = trim($data['customerWhatsapp'] ?? '');
            $clientCode = trim($data['clientCode'] ?? '');
            $planId = trim($data['planId'] ?? 'chatgpt-plus-30');
            $folderName = trim($data['folderName'] ?? '');
            $accessCredentials = trim($data['accessCredentials'] ?? '');
            $markAsPaid = !empty($data['markAsPaid']);
            $adminNotes = trim($data['adminNotes'] ?? '');
            $adminUid = trim($data['adminUid'] ?? 'Admin MEGASON');

            // Busca os dados do plano
            $pStmt = $db->prepare("SELECT * FROM plans WHERE id = ? LIMIT 1");
            $pStmt->execute([$planId]);
            $plan = $pStmt->fetch();

            if (!$plan) {
                sendJsonResponse(['error' => 'Plano selecionado não é válido.'], 400);
            }

            $dates = calculateSubscriptionDatesSql(null, (int)$plan['duration_days']);
            $subId = generateUuid('sub');
            $invoiceId = getNextInvoiceSequence($db);

            $finalFolder = !empty($folderName) ? $folderName : "MEGASON - " . explode(' ', $customerName)[0];
            $finalCreds = !empty($accessCredentials) ? $accessCredentials : "Instruções de acesso fornecidas pela administração.";

            $db->beginTransaction();

            $insSub = $db->prepare("
                INSERT INTO subscriptions (
                    id, user_id, client_code, customer_name, customer_email, customer_whatsapp,
                    plan_id, plan_name, price, currency, duration_days, status, folder_name,
                    access_credentials, admin_notes, latest_invoice_id, start_date, end_date,
                    approved_at, approved_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'MZN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $insSub->execute([
                $subId, $userId, $clientCode, $customerName, $customerEmail, $customerWhatsapp,
                $plan['id'], $plan['name'], $plan['price'], $plan['duration_days'],
                $markAsPaid ? 'active' : 'pending', $finalFolder, $finalCreds, $adminNotes,
                $invoiceId, $markAsPaid ? $dates['startDate'] : null,
                $markAsPaid ? $dates['endDate'] : null,
                $markAsPaid ? $dates['startDate'] : null,
                $markAsPaid ? $adminUid : null
            ]);

            $insInv = $db->prepare("
                INSERT INTO invoices (
                    id, invoice_number, subscription_id, user_id, client_code, customer_name,
                    customer_email, customer_whatsapp, plan_id, plan_name, amount, currency,
                    payment_method, status, confirmed_by, created_at, paid_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MZN', 'M-Pesa', ?, ?, NOW(), ?)
            ");
            $insInv->execute([
                $invoiceId, $invoiceId, $subId, $userId, $clientCode, $customerName,
                $customerEmail, $customerWhatsapp, $plan['id'], $plan['name'], $plan['price'],
                $markAsPaid ? 'paid' : 'pending',
                $markAsPaid ? $adminUid : null,
                $markAsPaid ? $dates['startDate'] : null
            ]);

            $db->commit();

            sendJsonResponse([
                'success' => true,
                'subscriptionId' => $subId,
                'invoice' => [
                    'id'            => $invoiceId,
                    'invoiceNumber' => $invoiceId,
                    'amount'        => $plan['price'],
                    'status'        => $markAsPaid ? 'paid' : 'pending'
                ],
                'message' => "Pacote {$plan['name']} atribuído com sucesso."
            ], 201);
            break;
        }

        // ----------------------------------------------------------------------
        // MÉTRICAS FINANCEIRAS DO DASHBOARD
        // ----------------------------------------------------------------------
        case 'metrics': {
            $totalReceived = (float) $db->query("SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'paid'")->fetchColumn();
            $totalBilled   = (float) $db->query("SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status != 'cancelled'")->fetchColumn();
            $activeSubs    = (int) $db->query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'")->fetchColumn();
            $pendingOrders = (int) $db->query("SELECT COUNT(*) FROM subscriptions WHERE status = 'pending'")->fetchColumn();
            $suspendedSubs = (int) $db->query("SELECT COUNT(*) FROM subscriptions WHERE status = 'suspended'")->fetchColumn();
            $totalCustomers= (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();

            sendJsonResponse([
                'success' => true,
                'metrics' => [
                    'totalReceived'        => $totalReceived,
                    'totalBilled'          => $totalBilled,
                    'activeSubscribers'    => $activeSubs,
                    'pendingOrders'        => $pendingOrders,
                    'suspendedSubscribers' => $suspendedSubs,
                    'totalCustomers'       => $totalCustomers
                ]
            ]);
            break;
        }

        default:
            sendJsonResponse(['error' => 'Ação de subscrições não reconhecida.'], 400);
    }
} catch (Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    sendJsonResponse(['error' => $e->getMessage()], 500);
}
