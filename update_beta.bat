@echo off
setlocal
chcp 65001 >nul

set "REPO_URL=https://github.com/Titannickbub/SatBot.git"
set "BRANCH=beta"
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "TMP_DIR=%TEMP%\satbot-beta-update-%RANDOM%-%RANDOM%"
set "BACKUP_DIR=%TMP_DIR%\backup"
set "REPO_DIR=%TMP_DIR%\repo"

powershell -NoProfile -Command "Write-Host 'AVISO: VERSAO BETA INSTAVEL - pode conter bugs e recursos incompletos.' -ForegroundColor Red"
echo.

if not exist "%ROOT%\package.json" (
  echo [UPDATE BETA] package.json nao encontrado. Execute este script na pasta do bot.
  exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
  echo [UPDATE BETA] Git nao esta instalado ou nao esta no PATH.
  exit /b 1
)

mkdir "%TMP_DIR%" >nul 2>&1
if errorlevel 1 (
  echo [UPDATE BETA] Nao foi possivel criar a pasta temporaria.
  exit /b 1
)

echo =========================================
echo [UPDATE BETA] Atualizacao manual pela branch %BRANCH%.
echo [UPDATE BETA] Preservando: settings
echo =========================================

git clone --depth 1 --branch "%BRANCH%" "%REPO_URL%" "%REPO_DIR%"
if errorlevel 1 (
  echo [UPDATE BETA] Falha ao baixar a branch. Nenhum arquivo do bot foi alterado.
  rmdir /s /q "%TMP_DIR%" >nul 2>&1
  exit /b 1
)

mkdir "%BACKUP_DIR%" >nul 2>&1
if exist "%ROOT%\settings" (
  xcopy "%ROOT%\settings\*" "%BACKUP_DIR%\settings\" /E /I /H /Y /Q >nul
  if errorlevel 1 if not exist "%BACKUP_DIR%\settings" (
    echo [UPDATE BETA] Falha ao preservar settings; atualizacao cancelada.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    exit /b 1
  )
)
if exist "%ROOT%\update_beta.bat" copy /y "%ROOT%\update_beta.bat" "%BACKUP_DIR%\update_beta.bat" >nul
if exist "%ROOT%\update_beta.sh" copy /y "%ROOT%\update_beta.sh" "%BACKUP_DIR%\update_beta.sh" >nul

if exist "%REPO_DIR%\.git" rmdir /s /q "%REPO_DIR%\.git"

for /f "delims=" %%F in ('dir /b "%ROOT%"') do (
  if /I not "%%~nxF"=="settings" if /I not "%%~nxF"=="update_beta.bat" if /I not "%%~nxF"=="update_beta.sh" (
    if exist "%ROOT%\%%F\" (
      rmdir /s /q "%ROOT%\%%F"
    ) else (
      del /f /q "%ROOT%\%%F"
    )
  )
)

xcopy "%REPO_DIR%\*" "%ROOT%\" /E /H /I /Y /Q >nul
if errorlevel 1 (
  echo [UPDATE BETA] Falha ao copiar os arquivos. Verifique a pasta do bot.
  rmdir /s /q "%TMP_DIR%" >nul 2>&1
  exit /b 1
)

if exist "%ROOT%\settings" rmdir /s /q "%ROOT%\settings"
if exist "%BACKUP_DIR%\settings" (
  mkdir "%ROOT%\settings" >nul 2>&1
  xcopy "%BACKUP_DIR%\settings\*" "%ROOT%\settings\" /E /I /H /Y /Q >nul
)
if exist "%BACKUP_DIR%\update_beta.bat" copy /y "%BACKUP_DIR%\update_beta.bat" "%ROOT%\update_beta.bat" >nul
if exist "%BACKUP_DIR%\update_beta.sh" copy /y "%BACKUP_DIR%\update_beta.sh" "%ROOT%\update_beta.sh" >nul

rmdir /s /q "%TMP_DIR%" >nul 2>&1
echo.
echo [UPDATE BETA] Atualizacao concluida. A pasta settings foi preservada.
exit /b 0
