<?php
/**
 * Endpoint de Gestão de Planos Comerciais
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
        // LISTAGEM DE PLANOS
        // ----------------------------------------------------------------------
        case 'list': {
            $includeInactive = isset($_GET['all']) && $_GET['all'] == '1';
            
            if ($includeInactive) {
                $stmt = $db->query("SELECT * FROM plans ORDER BY price ASC");
            } else {
                $stmt = $db->query("SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC");
            }
            
            $plans = $stmt->fetchAll();
            foreach ($plans as &$p) {
                $p['price'] = (float)$p['price'];
                $p['duration_days'] = (int)$p['duration_days'];
                $p['is_featured'] = (bool)$p['is_featured'];
                $p['is_active'] = (bool)$p['is_active'];
                if (!empty($p['features']) && is_string($p['features'])) {
                    $decoded = json_decode($p['features'], true);
                    $p['features'] = is_array($decoded) ? $decoded : [];
                } else if (empty($p['features'])) {
                    $p['features'] = [];
                }
            }

            sendJsonResponse(['success' => true, 'plans' => $plans]);
            break;
        }

        // ----------------------------------------------------------------------
        // GRAVAÇÃO / EDIÇÃO DE PLANO
        // ----------------------------------------------------------------------
        case 'save': {
            $id = trim($data['id'] ?? '');
            $name = trim($data['name'] ?? '');
            $price = isset($data['price']) ? (float)$data['price'] : 0.0;
            $durationDays = isset($data['duration_days']) ? (int)$data['duration_days'] : (isset($data['durationDays']) ? (int)$data['durationDays'] : 30);
            $durationLabel = trim($data['duration_label'] ?? ($data['durationLabel'] ?? "{$durationDays} Dias"));
            $badge = !empty($data['badge']) ? trim($data['badge']) : null;
            $isFeatured = !empty($data['is_featured']) || !empty($data['isFeatured']) ? 1 : 0;
            $isActive = isset($data['is_active']) ? (int)$data['is_active'] : (isset($data['isActive']) ? (int)$data['isActive'] : 1);
            $features = $data['features'] ?? [];

            if (empty($id) || empty($name) || $price <= 0) {
                sendJsonResponse(['success' => false, 'error' => 'Identificador, nome e preço válido são obrigatórios.'], 400);
            }

            $featuresJson = is_array($features) ? json_encode($features, JSON_UNESCAPED_UNICODE) : '[]';

            $stmt = $db->prepare("
                INSERT INTO plans (id, name, duration_days, duration_label, price, badge, is_featured, features, is_active)
                VALUES (:id, :name, :duration_days, :duration_label, :price, :badge, :is_featured, :features, :is_active)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    duration_days = VALUES(duration_days),
                    duration_label = VALUES(duration_label),
                    price = VALUES(price),
                    badge = VALUES(badge),
                    is_featured = VALUES(is_featured),
                    features = VALUES(features),
                    is_active = VALUES(is_active)
            ");

            $stmt->execute([
                ':id'             => $id,
                ':name'           => $name,
                ':duration_days'  => $durationDays,
                ':duration_label' => $durationLabel,
                ':price'          => $price,
                ':badge'          => $badge,
                ':is_featured'    => $isFeatured,
                ':features'       => $featuresJson,
                ':is_active'      => $isActive
            ]);

            sendJsonResponse([
                'success' => true,
                'message' => 'Plano comercial salvo com sucesso.',
                'plan' => [
                    'id'            => $id,
                    'name'          => $name,
                    'durationDays'  => $durationDays,
                    'durationLabel' => $durationLabel,
                    'price'         => $price,
                    'badge'         => $badge,
                    'isFeatured'    => (bool)$isFeatured,
                    'features'      => is_array($features) ? $features : [],
                    'isActive'      => (bool)$isActive
                ]
            ]);
            break;
        }

        // ----------------------------------------------------------------------
        // ELIMINAR PLANO
        // ----------------------------------------------------------------------
        case 'delete': {
            $id = trim($data['id'] ?? ($_GET['id'] ?? ''));
            if (empty($id)) {
                sendJsonResponse(['success' => false, 'error' => 'ID do plano não fornecido.'], 400);
            }

            $stmt = $db->prepare("DELETE FROM plans WHERE id = :id");
            $stmt->execute([':id' => $id]);

            sendJsonResponse(['success' => true, 'message' => "Plano {$id} eliminado com sucesso."]);
            break;
        }

        // ----------------------------------------------------------------------
        // SEED INICIAL DE PLANOS
        // ----------------------------------------------------------------------
        case 'seed': {
            $stmtCount = $db->query("SELECT COUNT(*) FROM plans");
            $count = (int)$stmtCount->fetchColumn();

            if ($count === 0) {
                $defaultPlans = [
                    [
                        'id' => 'chatgpt-plus-30',
                        'name' => '30 Dias (1 Mês)',
                        'duration_days' => 30,
                        'duration_label' => '30 Dias (1 Mês)',
                        'price' => 300.00,
                        'badge' => null,
                        'is_featured' => 0,
                        'features' => json_encode([
                            'Modelos avançados de IA (GPT-6 Astra)',
                            'Criação de textos, artigos e ideias',
                            'Geração e edição de imagens em alta resolução',
                            'Envio e análise de documentos, PDFs e ficheiros',
                            'Pesquisa na Internet aprofundada em tempo real',
                            'Conversas fluidas por voz',
                            'Pasta individual e senhas de acesso'
                        ], JSON_UNESCAPED_UNICODE)
                    ],
                    [
                        'id' => 'chatgpt-plus-90',
                        'name' => '90 Dias (3 Meses)',
                        'duration_days' => 90,
                        'duration_label' => '90 Dias (3 Meses)',
                        'price' => 850.00,
                        'badge' => 'Poupa 50 MT',
                        'is_featured' => 1,
                        'features' => json_encode([
                            'Modelos avançados de IA (GPT-6 Astra)',
                            'Criação de textos, artigos e ideias',
                            'Geração e edição de imagens em alta resolução',
                            'Envio e análise de documentos, PDFs e ficheiros',
                            'Pesquisa na Internet aprofundada em tempo real',
                            'Conversas fluidas por voz',
                            'Pasta individual e senhas de acesso'
                        ], JSON_UNESCAPED_UNICODE)
                    ],
                    [
                        'id' => 'chatgpt-plus-180',
                        'name' => '180 Dias (6 Meses)',
                        'duration_days' => 180,
                        'duration_label' => '180 Dias (6 Meses)',
                        'price' => 1650.00,
                        'badge' => 'Poupa 150 MT',
                        'is_featured' => 0,
                        'features' => json_encode([
                            'Modelos avançados de IA (GPT-6 Astra)',
                            'Criação de textos, artigos e ideias',
                            'Geração e edição de imagens em alta resolução',
                            'Envio e análise de documentos, PDFs e ficheiros',
                            'Pesquisa na Internet aprofundada em tempo real',
                            'Conversas fluidas por voz',
                            'Pasta individual e senhas de acesso'
                        ], JSON_UNESCAPED_UNICODE)
                    ],
                    [
                        'id' => 'chatgpt-plus-365',
                        'name' => '365 Dias (1 Ano)',
                        'duration_days' => 365,
                        'duration_label' => '365 Dias (1 Ano)',
                        'price' => 3200.00,
                        'badge' => 'Mais Económico',
                        'is_featured' => 0,
                        'features' => json_encode([
                            'Modelos avançados de IA (GPT-6 Astra)',
                            'Criação de textos, artigos e ideias',
                            'Geração e edição de imagens em alta resolução',
                            'Envio e análise de documentos, PDFs e ficheiros',
                            'Pesquisa na Internet aprofundada em tempo real',
                            'Conversas fluidas por voz',
                            'Pasta individual e senhas de acesso'
                        ], JSON_UNESCAPED_UNICODE)
                    ]
                ];

                $stmt = $db->prepare("
                    INSERT INTO plans (id, name, duration_days, duration_label, price, badge, is_featured, features, is_active)
                    VALUES (:id, :name, :duration_days, :duration_label, :price, :badge, :is_featured, :features, 1)
                ");

                foreach ($defaultPlans as $p) {
                    $stmt->execute([
                        ':id'             => $p['id'],
                        ':name'           => $p['name'],
                        ':duration_days'  => $p['duration_days'],
                        ':duration_label' => $p['duration_label'],
                        ':price'          => $p['price'],
                        ':badge'          => $p['badge'],
                        ':is_featured'    => $p['is_featured'],
                        ':features'       => $p['features']
                    ]);
                }

                sendJsonResponse(['success' => true, 'message' => 'Planos padrão inicializados com sucesso.']);
            } else {
                sendJsonResponse(['success' => true, 'message' => 'Tabela de planos já continha registos.']);
            }
            break;
        }

        default:
            sendJsonResponse(['success' => false, 'error' => "Ação '{$action}' não suportada."], 400);
            break;
    }
} catch (Exception $e) {
    sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
