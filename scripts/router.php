<?php
/**
 * Router para Servidor Local Embutido do PHP — MEGASON
 * Desenvolvido por Zedecks IT
 * Suporta SPA, rotas /admin e API MySQL
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$filePath = realpath(__DIR__ . '/..') . $uri;

// 1. Rota Administrativa /admin ou /admin/
if ($uri === '/admin' || $uri === '/admin/') {
    $adminIndex = realpath(__DIR__ . '/../admin/index.html');
    if ($adminIndex && file_exists($adminIndex)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($adminIndex);
        exit;
    }
}

// 2. Ficheiros Estáticos (.js, .css, .svg, .json, imagens)
if ($filePath && file_exists($filePath) && !is_dir($filePath)) {
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    
    // Se for PHP, executa normalmente
    if ($ext === 'php') {
        require $filePath;
        exit;
    }

    // Para JavaScript ES Modules, garante cabeçalho correto
    if ($ext === 'js' || $ext === 'mjs') {
        header('Content-Type: application/javascript; charset=UTF-8');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        readfile($filePath);
        exit;
    }

    // Deixa o servidor interno do PHP manipular outros ficheiros estáticos
    return false;
}

// 3. Rota Raiz
if ($uri === '/' || $uri === '') {
    $rootIndex = realpath(__DIR__ . '/../index.html');
    if ($rootIndex && file_exists($rootIndex)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($rootIndex);
        exit;
    }
}

return false;
