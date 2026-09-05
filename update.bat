@echo off
setlocal enabledelayedexpansion

set "REPO_URL=https://github.com/Titannickbub/SatBot.git"
set "BRANCH=main"
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "TMP_DIR=%TEMP%\satbot-update-%RANDOM%"
set "BACKUP_DIR=%TMP_DIR%\backup"
set "REPO_DIR=%TMP_DIR%\repo"
mkdir "%TMP_DIR%" >nul 2>&1
mkdir "%BACKUP_DIR%" >nul 2>&1

echo =========================================
echo [UPDATE] Iniciando atualizacao do SatBot...
echo [UPDATE] Repositorio: %REPO_URL%
echo [UPDATE] Preservando: settings
echo =========================================

if exist "%ROOT%\settings" (
  mkdir "%BACKUP_DIR%\settings" >nul 2>&1
  xcopy "%ROOT%\settings\*" "%BACKUP_DIR%\settings\" /E /I /Y /Q >nul
)

if exist "%ROOT%\update.sh" copy "%ROOT%\update.sh" "%TMP_DIR%\update.sh" >nul 2>&1
if exist "%ROOT%\update.bat" copy "%ROOT%\update.bat" "%TMP_DIR%\update.bat" >nul 2>&1

for /f "delims=" %%F in ('dir /b "%ROOT%"') do (
  if /I not "%%~nxF"=="settings" if /I not "%%~nxF"=="update.sh" if /I not "%%~nxF"=="update.bat" del /f /q "%ROOT%\%%~nxF"
)
for /d %%D in ("%ROOT%\*") do (
  if /I not "%%~nxD"=="settings" if /I not "%%~nxD"=="update.sh" if /I not "%%~nxD"=="update.bat" rd /s /q "%%D"
)

if exist "%REPO_DIR%" rd /s /q "%REPO_DIR%"

git clone --depth 1 --branch %BRANCH% %REPO_URL% "%REPO_DIR%" >nul 2>&1
if errorlevel 1 (
  echo [UPDATE] Clone via git falhou. Tentando baixar o ZIP do GitHub...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; $tmp = '%TMP_DIR%'; Invoke-WebRequest -Uri 'https://github.com/Titannickbub/SatBot/archive/refs/heads/main.zip' -OutFile (Join-Path $tmp 'satbot.zip'); Expand-Archive -Path (Join-Path $tmp 'satbot.zip') -DestinationPath $tmp -Force; $repo = Get-ChildItem -Path $tmp -Directory | Where-Object { $_.Name -like 'SatBot*' } | Select-Object -First 1; if ($repo) { Copy-Item -Path (Join-Path $repo.FullName '*') -Destination '%ROOT%' -Recurse -Force }"
)

if exist "%REPO_DIR%" (
  xcopy "%REPO_DIR%\*" "%ROOT%\" /E /H /I /Y /Q >nul
)

if exist "%ROOT%\settings" rd /s /q "%ROOT%\settings"

if exist "%BACKUP_DIR%\settings" (
  mkdir "%ROOT%\settings" >nul 2>&1
  xcopy "%BACKUP_DIR%\settings\*" "%ROOT%\settings\" /E /I /Y /Q >nul
)

if exist "%TMP_DIR%\update.sh" copy "%TMP_DIR%\update.sh" "%ROOT%\update.sh" >nul 2>&1
if exist "%TMP_DIR%\update.bat" copy "%TMP_DIR%\update.bat" "%ROOT%\update.bat" >nul 2>&1

rmdir /s /q "%TMP_DIR%" >nul 2>&1

echo.
echo [UPDATE] Atualizacao concluida.
echo [UPDATE] A pasta settings foi preservada.
echo [UPDATE] Para iniciar: start.bat
exit /b 0
