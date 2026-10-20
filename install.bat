@echo off
setlocal EnableExtensions

rem Instalador nao destrutivo do SatBot.
set "REPO_URL=%SATBOT_REPO_URL%"
if not defined REPO_URL set "REPO_URL=https://github.com/Titannickbub/SatBot.git"
set "BRANCH=%SATBOT_BRANCH%"
if not defined BRANCH set "BRANCH=main"
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "TMP_DIR=%TEMP%\satbot-install-%RANDOM%%RANDOM%"
set "REPO_DIR=%TMP_DIR%\repo"

echo ========================================
echo [INSTALL] Instalador do SatBot
echo [INSTALL] Repositorio: %REPO_URL%
echo [INSTALL] Destino: %ROOT%
echo ========================================

if exist "%ROOT%\index.js" if exist "%ROOT%\package.json" if exist "%ROOT%\commands\" if exist "%ROOT%\functions\" (
    echo [ERRO] Ja existe uma instalacao do SatBot neste diretorio.
    echo [INFO] Use update.bat para atualizar uma instalacao existente.
    exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao encontrado. Instale o Git e tente novamente.
    exit /b 1
)

mkdir "%TMP_DIR%" >nul 2>&1
git clone --depth 1 --branch "%BRANCH%" "%REPO_URL%" "%REPO_DIR%" >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Nao foi possivel clonar o repositorio.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    exit /b 1
)

rem Remove metadados do clone antes da copia.
if exist "%REPO_DIR%\.git" rmdir /s /q "%REPO_DIR%\.git"
if exist "%REPO_DIR%\install.sh" del /f /q "%REPO_DIR%\install.sh"
if exist "%REPO_DIR%\install.bat" del /f /q "%REPO_DIR%\install.bat"

rem Confere conflitos antes de copiar para garantir que nada sera sobrescrito.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$source=[IO.Path]::GetFullPath('%REPO_DIR%'); $target=[IO.Path]::GetFullPath('%ROOT%'); $conflicts=Get-ChildItem -LiteralPath $source -Recurse -File | ForEach-Object { $relative=$_.FullName.Substring($source.Length).TrimStart('\'); if ($relative -notin @('install.bat','install.sh')) { $destination=Join-Path $target $relative; if (Test-Path -LiteralPath $destination) { $relative } } }; if ($conflicts) { Write-Host '[ERRO] Instalacao cancelada: existem arquivos conflitantes.'; $conflicts | ForEach-Object { Write-Host (' - ' + $_) }; exit 2 }"
if errorlevel 1 (
    echo [INFO] Nenhum arquivo foi alterado.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    exit /b 1
)

xcopy "%REPO_DIR%\*" "%ROOT%\" /E /H /I /Q >nul
if errorlevel 1 (
    echo [ERRO] Falha ao copiar os arquivos. Nenhuma limpeza adicional foi executada.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    exit /b 1
)

if not exist "%ROOT%\package.json" (
    echo [ERRO] Copia incompleta: package.json nao foi encontrado.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [AVISO] npm nao encontrado. Instale o Node.js 18+ e execute npm install.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    exit /b 1
)

echo [INFO] Instalando dependencias...
call npm.cmd install --no-audit --no-fund --no-progress
if errorlevel 1 (
    echo [ERRO] A copia foi concluida, mas a instalacao das dependencias falhou.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    exit /b 1
)

rmdir /s /q "%TMP_DIR%" >nul 2>&1
echo.
echo [INSTALL] Instalacao concluida.
echo [INFO] Para iniciar: start.bat
exit /b 0
