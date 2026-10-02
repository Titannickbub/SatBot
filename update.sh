#!/bin/sh
set -eu

REPO_URL="https://github.com/Titannickbub/SatBot.git"
BRANCH="main"
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
TMP_DIR="$(mktemp -d)"
BACKUP_DIR="$TMP_DIR/backup"
REPO_DIR="$TMP_DIR/repo"

echo "========================================"
echo "[UPDATE] Iniciando atualização do SatBot..."
echo "[UPDATE] Repositório: $REPO_URL"
echo "[UPDATE] Preservando: settings"
echo "========================================"

mkdir -p "$BACKUP_DIR"

if [ -d "$ROOT_DIR/settings" ]; then
    mkdir -p "$BACKUP_DIR/settings"
    cp -a "$ROOT_DIR/settings/." "$BACKUP_DIR/settings/"
fi

if [ -f "$ROOT_DIR/update.sh" ]; then cp -a "$ROOT_DIR/update.sh" "$TMP_DIR/update.sh"; fi
if [ -f "$ROOT_DIR/update.bat" ]; then cp -a "$ROOT_DIR/update.bat" "$TMP_DIR/update.bat"; fi

find "$ROOT_DIR" -mindepth 1 -maxdepth 1 ! -name 'settings' ! -name 'update.sh' ! -name 'update.bat' -exec rm -rf -- {} +

if git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$REPO_DIR" >/dev/null 2>&1; then
    :
else
    echo "[UPDATE] Clone via git falhou. Tentando baixar o ZIP do GitHub..."
    curl -L --fail "https://github.com/Titannickbub/SatBot/archive/refs/heads/$BRANCH.zip" -o "$TMP_DIR/satbot.zip"
    unzip -q "$TMP_DIR/satbot.zip" -d "$TMP_DIR"
    REPO_DIR="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'SatBot*' | head -n 1)"
fi

cp -a "$REPO_DIR"/. "$ROOT_DIR"/

rm -rf "$ROOT_DIR/settings"
mkdir -p "$ROOT_DIR/settings"

if [ -d "$BACKUP_DIR/settings" ] && [ "$(ls -A "$BACKUP_DIR/settings" 2>/dev/null)" ]; then
    cp -a "$BACKUP_DIR/settings/." "$ROOT_DIR/settings/"
fi

if [ -f "$TMP_DIR/update.sh" ]; then cp -a "$TMP_DIR/update.sh" "$ROOT_DIR/update.sh"; fi
if [ -f "$TMP_DIR/update.bat" ]; then cp -a "$TMP_DIR/update.bat" "$ROOT_DIR/update.bat"; fi

rm -rf "$TMP_DIR"

echo ""
echo "[UPDATE] Atualização concluída."
echo "[UPDATE] As pastas config e settings foram preservadas."
echo "[UPDATE] Para iniciar: bash start.sh"
