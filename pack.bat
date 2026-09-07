@echo off
setlocal enabledelayedexpansion

rem ==================================================
rem SCRIPT DE COMPACTACAO DO SATBOT (WINDOWS)
rem ==================================================

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

set BOT_VERSION=
for /f "tokens=*" %%i in ('node -e "const pkg=require('./package.json'); console.log(pkg.version || '');" 2^>nul') do set BOT_VERSION=%%i

if not "%~1"=="" (
    set "OUTPUT_ZIP=%~1"
) else if not "%BOT_VERSION%"=="" (
    set "OUTPUT_ZIP=satbot_%BOT_VERSION%.zip"
) else (
    set "OUTPUT_ZIP=satbot_release.zip"
)

echo.
echo ==================================================
echo [PACK] Criando pacote: %OUTPUT_ZIP%
echo ==================================================
echo.

rem Lista de pastas e arquivos a incluir
set "ITEMS=changelog commands docs functions middlewares platforms core.js index.js install.bat install.sh package.json README.md start.bat start.sh update.bat update.sh"

set "EXISTING_ITEMS="
for %%I in (%ITEMS%) do (
    if exist "%%I" (
        set "EXISTING_ITEMS=!EXISTING_ITEMS! %%I"
        echo  [+] %%I
    ) else (
        echo  [-] %%I (nao encontrado, ignorado)
    )
)

if "%EXISTING_ITEMS%"=="" (
    echo.
    echo [ERRO] Nenhum arquivo ou pasta correspondente foi encontrado para compactar.
    exit /b 1
)

echo.
echo [INFO] Compactando arquivos...

if exist "%OUTPUT_ZIP%" del /f /q "%OUTPUT_ZIP%"

rem Tentativa 1: tar.exe nativo do Windows 10/11
where tar.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    tar.exe -a -c -f "%OUTPUT_ZIP%" %EXISTING_ITEMS%
    if %ERRORLEVEL% equ 0 goto success
)

rem Tentativa 2: PowerShell Compress-Archive
powershell -NoProfile -Command "$items = @('%EXISTING_ITEMS:~1%'.Split(' ')); Compress-Archive -Path $items -DestinationPath '%OUTPUT_ZIP%' -Force" >nul 2>&1
if %ERRORLEVEL% equ 0 goto success

rem Tentativa 3: 7-Zip se disponivel
where 7z.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    7z.exe a "%OUTPUT_ZIP%" %EXISTING_ITEMS% >nul
    if %ERRORLEVEL% equ 0 goto success
)

echo.
echo [ERRO] Falha ao criar o arquivo ZIP. Verifique se o tar, PowerShell ou 7-Zip estao disponiveis.
exit /b 1

:success
echo.
echo ==================================================
echo [SUCESSO] Pacote criado com sucesso:
echo           %ROOT_DIR%%OUTPUT_ZIP%
echo ==================================================
echo.
