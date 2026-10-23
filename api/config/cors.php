<?php
/**
 * Utilitários de Resposta HTTP, Headers CORS e Sanitização
 * Plataforma MEGASON — Desenvolvido por Zedecks IT
 */

// Permite CORS para integração com o frontend
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Resposta imediata a requisições preflight OPTIONS
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Lê o corpo da requisição JSON
 * @return array
 */
function getRequestJson(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return $_POST ?? [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Envia uma resposta JSON padronizada e encerra o script
 * @param mixed $data
 * @param int $statusCode
 */
function sendJsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Gera um ID único no formato canónico do sistema
 * @param string $prefix
 * @return string
 */
function generateUuid(string $prefix = ''): string {
    $bytes = random_bytes(16);
    $bytes[6] = chr(ord($bytes[6]) & 0x0f | 0x40); // UUID v4
    $bytes[8] = chr(ord($bytes[8]) & 0x3f | 0x80);
    $uuid = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    return $prefix ? $prefix . '_' . substr($uuid, 0, 18) : $uuid;
}

/**
 * Gera um código de cliente oficial no formato AI-XXXX
 * @return string
 */
function generateClientCode(): string {
    $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    $code = '';
    for ($i = 0; $i < 4; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return 'AI-' . $code;
}
