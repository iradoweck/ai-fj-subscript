#!/usr/bin/env bash
# Script de Inicialização Local — MEGASON (Porta 1080)
# Desenvolvido por Zedecks IT
# Diretório: D:\ZEDECKLAB\ClienteProjects\ai-fj-subscript (Faixa 1000 - 1999)

PORT=1080
HOST="127.0.0.1"

echo "======================================================"
echo "  Iniciando Servidor Local MEGASON (PHP + MySQL API)"
echo "  URL Landing: http://$HOST:$PORT/"
echo "  URL Admin:   http://$HOST:$PORT/admin/"
echo "======================================================"

# Verifica se o PHP está disponível
if command -v php >/dev/null 2>&1; then
    php -S "$HOST:$PORT"
else
    echo "PHP não encontrado no PATH. Por favor, instale o PHP 8.x ou utilize o XAMPP/Live Server."
    exit 1
fi
