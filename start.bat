@echo off
rem ==================================================
rem SATELLA BOT COLD BOOT RUNNER (WINDOWS)
rem ==================================================

for /f "tokens=*" %%i in ('node -e "const pkg=require('./package.json'); console.log(pkg.name || 'Satella');" 2^>nul') do set BOT_NAME=%%i
for /f "tokens=*" %%i in ('node -e "const pkg=require('./package.json'); console.log(pkg.version || '0.0.0');" 2^>nul') do set BOT_VERSION=%%i
set DEV_MODE=development

echo.
echo ==================================================
echo [BOOT] Bot: %BOT_NAME%
echo [BOOT] Versão: %BOT_VERSION%
echo [BOOT] Ambiente: %DEV_MODE%
echo ==================================================
echo.
echo [INFO] Instalando dependencias...
echo.
call npm install

echo.
echo [INFO] Iniciando Satella com loop de auto-recuperacao...
echo.

:loop
node index.js
echo.
echo [WATCHER] O processo do bot terminou. Reiniciando em 2 segundos...
echo.
timeout /t 2 >nul
goto loop
