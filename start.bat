@echo off
rem ==================================================
rem BOT COLD BOOT RUNNER (WINDOWS)
rem ==================================================

for /f "tokens=*" %%i in ('node -e "const pkg=require('./package.json'); console.log(pkg.name || 'Sat Bot');" 2^>nul') do set BOT_NAME=%%i
for /f "tokens=*" %%i in ('node -e "const pkg=require('./package.json'); console.log(pkg.version || '0.0.0');" 2^>nul') do set BOT_VERSION=%%i
set DEV_MODE=development

echo.
echo ==================================================
echo [BOOT] Bot: %BOT_NAME%
echo [BOOT] Versão: %BOT_VERSION%
echo [BOOT] Ambiente: %DEV_MODE%
echo [BOOT] Dados: settings\
echo ==================================================
echo.
echo.
echo [INFO] Iniciando o bot com loop de auto-recuperacao...
echo.

:loop
if not exist "node_modules\" (
    set "DEPENDENCIES_OK="
) else (
    call npm.cmd ls --depth=0 >nul 2>&1
    if errorlevel 1 (set "DEPENDENCIES_OK=") else (set "DEPENDENCIES_OK=1")
)
if not defined DEPENDENCIES_OK (
    echo [INFO] Dependencias ausentes ou desatualizadas. Instalando...
    echo.
    call npm.cmd install --no-audit --no-fund --no-progress
    if errorlevel 1 (
        echo [ERRO] Nao foi possivel instalar as dependencias.
        exit /b 1
    )
)
node index.js
echo.
echo [WATCHER] O processo do bot terminou. Reiniciando em 2 segundos...
echo.
timeout /t 2 >nul
goto loop
