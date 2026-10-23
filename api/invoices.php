<?php
/**
 * Endpoint de Gestão de Faturas Financeiras
 * Suporta emissão de faturas no formato canónico FT[ANO]AIXXX e consulta de histórico
 * Plataforma MEGASON — Desenvolvido por Zedecks IT
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';

$action = $_GET['action'] ?? 'list';
$data = getRequestJson();

/**
 * Gera o próximo número de fatura sequencial no formato FT[ANO]AIXXX
 * Exemplo: FT2026AI001, FT2026AI002...
 * @param PDO $db
 * @return string
 */
function getNextInvoiceSequence(PDO $db): string {
    $currentYear = date('Y');
    $prefix = "FT{$currentYear}AI";

    // Bloqueio atómico via SELECT para garantir que duas requisições simultâneas não colidam
    $stmt = $db->prepare("
        SELECT invoice_number 
        FROM invoices 
        WHERE invoice_number LIKE ? 
        ORDER BY invoice_number DESC 
        LIMIT 1
    ");
    $stmt->execute(["{$prefix}%"]);
    $last = $stmt->fetchColumn();

    if ($last) {
        $numPart = (int) substr($last, strlen($prefix));
        $nextNum = $numPart + 1;
    } else {
        $nextNum = 1;
    }

    return $prefix . str_pad((string)$nextNum, 3, '0', STR_PAD_LEFT);
}

try {
    $db = getDbConnection();

    switch ($action) {
        // ----------------------------------------------------------------------
        // PRÓXIMO NÚMERO DE FATURA
        // ----------------------------------------------------------------------
        case 'next-number': {
            $next = getNextInvoiceSequence($db);
            sendJsonResponse(['nextInvoiceNumber' => $next]);
            break;
        }

        // ----------------------------------------------------------------------
        // LISTAGEM DE FATURAS
        // ----------------------------------------------------------------------
        case 'list': {
            $userId = $_GET['userId'] ?? null;
            $email = $_GET['email'] ?? null;
            $status = $_GET['status'] ?? 'all';

            $sql = "SELECT * FROM invoices WHERE 1=1";
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
            $invoices = $stmt->fetchAll();

            sendJsonResponse([
                'success' => true,
                'invoices' => $invoices
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // DETALHES DE UMA FATURA ESPECÍFICA (Para o espelho de recibo)
        // ----------------------------------------------------------------------
        case 'get': {
            $id = $_GET['id'] ?? $data['id'] ?? '';
            if (empty($id)) {
                sendJsonResponse(['error' => 'Identificador da fatura é obrigatório.'], 400);
            }

            $stmt = $db->prepare("SELECT * FROM invoices WHERE id = ? OR invoice_number = ? LIMIT 1");
            $stmt->execute([$id, $id]);
            $invoice = $stmt->fetch();

            if (!$invoice) {
                sendJsonResponse(['error' => 'Fatura não encontrada.'], 404);
            }

            sendJsonResponse([
                'success' => true,
                'invoice' => $invoice
            ]);
            break;
        }

        default:
            sendJsonResponse(['error' => 'Ação de faturas não reconhecida.'], 400);
    }
} catch (Exception $e) {
    sendJsonResponse(['error' => $e->getMessage()], 500);
}
