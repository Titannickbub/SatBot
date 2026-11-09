@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo Publicacao completa no GitHub
echo ============================================
echo.

if not exist "package.json" (
    echo ERRO: package.json nao encontrado nesta pasta.
    pause
    exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERRO: esta pasta nao pertence a um repositorio Git.
    pause
    exit /b 1
)

set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if /i not "%CURRENT_BRANCH%"=="main" if /i not "%CURRENT_BRANCH%"=="beta" (
    echo ERRO: publique somente pelas branches main ou beta.
    pause
    exit /b 1
)
if exist "node_modules\" if /i not "%CURRENT_BRANCH%"=="beta" (
    echo ERRO: esta pasta contem node_modules e parece ser a pasta de desenvolvimento.
    echo A publicacao da branch main deve continuar usando a pasta separada de upload.
    pause
    exit /b 1
)
if /i "%CURRENT_BRANCH%"=="beta" (
    powershell -NoProfile -Command "Write-Host 'ATENCAO: BETA INSTAVEL - esta publicacao pode conter bugs e recursos incompletos.' -ForegroundColor Red"
    echo.
)

where node >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado. Ele e necessario para ler a versao e descricao do package.json.
    pause
    exit /b 1
)

set "COMMIT_FILE=%TEMP%\satbot-commit-%RANDOM%-%RANDOM%.txt"
node -e "const fs = require('fs'); const p = require('./package.json'); if (!p.version || !p.description) process.exit(1); process.stdout.write(p.version + ' - ' + p.description)" > "%COMMIT_FILE%"
if errorlevel 1 goto :failed

if not exist "%COMMIT_FILE%" (
    echo ERRO: nao foi possivel ler version e description do package.json.
    pause
    exit /b 1
)

echo Pasta de upload: %CD%
echo Branch: %CURRENT_BRANCH%
<nul set /p "=Commit: "
type "%COMMIT_FILE%"
echo.
echo.
echo ATENCAO: os arquivos atuais desta pasta substituirao o conteudo do branch %CURRENT_BRANCH%.
echo O push forcado pode sobrescrever commits que existam apenas no GitHub.
echo.
set "CONFIRM="
set /p "CONFIRM=Para continuar, digite PUBLICAR: "
if /i not "%CONFIRM%"=="PUBLICAR" (
    echo Publicacao cancelada.
    if exist "%COMMIT_FILE%" del "%COMMIT_FILE%"
    exit /b 0
)

echo.
echo [1/4] Removendo os arquivos atuais do indice...
git rm -r --cached .
if errorlevel 1 goto :failed

echo.
echo [2/4] Preparando os arquivos presentes nesta pasta...
git add .
if errorlevel 1 goto :failed

echo.
echo [3/4] Criando o commit...
git commit -F "%COMMIT_FILE%"
if errorlevel 1 goto :failed

echo.
echo [4/4] Enviando para origin/%CURRENT_BRANCH% com push forcado...
git push --force origin "%CURRENT_BRANCH%"
if errorlevel 1 goto :failed

echo.
echo Publicacao concluida com sucesso.
if exist "%COMMIT_FILE%" del "%COMMIT_FILE%"
pause
exit /b 0

:failed
echo.
echo ERRO: uma etapa falhou. O script foi interrompido; verifique a mensagem acima.
if defined COMMIT_FILE if exist "%COMMIT_FILE%" del "%COMMIT_FILE%"
pause
exit /b 1
