<?php
/**
 * Endpoint de Gestão de Configurações do Sistema
 * Coordenadas de pagamento, chaves de email e dados de contacto
 * Plataforma MEGASON — Desenvolvido por Zedecks IT
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/db.php';

$action = $_GET['action'] ?? 'get';
$data = getRequestJson();

try {
    $db = getDbConnection();

    switch ($action) {
        // ----------------------------------------------------------------------
        // OBTER TODAS AS CONFIGURAÇÕES
        // ----------------------------------------------------------------------
        case 'get': {
            $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
            $rows = $stmt->fetchAll();
            
            $settings = [];
            foreach ($rows as $row) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }

            // Defaults oficiais caso ainda não estejam no banco
            $defaults = [
                'admin_email'        => 'comercial@admin-megason.site',
                'admin_whatsapp'     => '842256366',
                'mpesa_number'       => '842256366',
                'mpesa_holder'       => 'FRANCISCO',
                'emola_number'       => '861557953',
                'emola_holder'       => 'FRANCISCO',
                'absa_account'       => '0708101028295',
                'absa_nib'           => '000207080810102829586',
                'absa_holder'        => 'MEGASON',
                'emailjs_service_id' => '',
                'emailjs_template_id'=> '',
                'emailjs_public_key' => ''
            ];

            foreach ($defaults as $k => $v) {
                if (!isset($settings[$k])) {
                    $settings[$k] = $v;
                }
            }

            sendJsonResponse([
                'success' => true,
                'settings' => $settings
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // GRAVAR / ATUALIZAR CONFIGURAÇÕES
        // ----------------------------------------------------------------------
        case 'save': {
            if (empty($data)) {
                sendJsonResponse(['success' => false, 'error' => 'Nenhum dado recebido para atualização.'], 400);
            }

            $stmt = $db->prepare("
                INSERT INTO settings (setting_key, setting_value)
                VALUES (:key, :val)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            ");

            $db->beginTransaction();
            foreach ($data as $key => $val) {
                // Filtra chaves válidas
                $key = trim($key);
                $valStr = is_array($val) ? json_encode($val) : (string)$val;
                $stmt->execute([
                    ':key' => $key,
                    ':val' => $valStr
                ]);
            }
            $db->commit();

            sendJsonResponse([
                'success' => true,
                'message' => 'Configurações atualizadas com sucesso.'
            ]);
            break;
        }

        default:
            sendJsonResponse(['success' => false, 'error' => "Ação '{$action}' não suportada."], 400);
            break;
    }
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
