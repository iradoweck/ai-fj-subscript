@echo off
REM Script de Inicialização Local — MEGASON (Porta 1080)
REM Desenvolvido por Zedecks IT
REM Diretório: D:\ZEDECKLAB\ClienteProjects\ai-fj-subscript (Faixa 1000 - 1999)

set PORT=1080
set HOST=127.0.0.1

echo ======================================================
echo   Iniciando Servidor Local MEGASON (PHP + MySQL API)
echo   URL Landing: http://%HOST%:%PORT%/
echo   URL Admin:   http://%HOST%:%PORT%/admin/
echo ======================================================

where php >nul 2>nul
if %ERRORLEVEL% equ 0 (
    php -S %HOST%:%PORT% scripts\router.php
) else (
    echo PHP nao encontrado no PATH do Windows.
    echo Inicie o seu servidor local (XAMPP, Laragon, WAMP ou Live Server na porta 1080).
    pause
)
