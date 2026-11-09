#!/bin/sh
set -eu

REPO_URL="https://github.com/Titannickbub/SatBot.git"
BRANCH="beta"
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
TMP_DIR="$(mktemp -d)"
REPO_DIR="$TMP_DIR/repo"
BACKUP_DIR="$TMP_DIR/backup"

cleanup() {
    rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT HUP INT TERM

if [ ! -f "$ROOT_DIR/package.json" ]; then
    echo "[UPDATE BETA] package.json não encontrado; execute este script na pasta do bot." >&2
    exit 1
fi

if ! command -v git >/dev/null 2>&1; then
    echo "[UPDATE BETA] Git não está instalado ou não está no PATH." >&2
    exit 1
fi

echo "========================================"
echo "[UPDATE BETA] Atualizando manualmente pela branch $BRANCH..."
echo "[UPDATE BETA] Preservando: settings"
echo "========================================"

if ! git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"; then
    echo "[UPDATE BETA] Não foi possível baixar a branch $BRANCH. Nenhum arquivo do bot foi alterado." >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"
if [ -d "$ROOT_DIR/settings" ]; then
    cp -a "$ROOT_DIR/settings" "$BACKUP_DIR/settings"
fi
for updater in update_beta.sh update_beta.bat; do
    if [ -f "$ROOT_DIR/$updater" ]; then
        cp -p "$ROOT_DIR/$updater" "$BACKUP_DIR/$updater"
    fi
done

rm -rf -- "$REPO_DIR/.git"
find "$ROOT_DIR" -mindepth 1 -maxdepth 1 \
    ! -name settings \
    ! -name update_beta.sh \
    ! -name update_beta.bat \
    -exec rm -rf -- {} +

cp -a "$REPO_DIR"/. "$ROOT_DIR"/

rm -rf -- "$ROOT_DIR/settings"
if [ -d "$BACKUP_DIR/settings" ]; then
    cp -a "$BACKUP_DIR/settings" "$ROOT_DIR/settings"
fi
for updater in update_beta.sh update_beta.bat; do
    if [ -f "$BACKUP_DIR/$updater" ]; then
        cp -p "$BACKUP_DIR/$updater" "$ROOT_DIR/$updater"
    fi
done

echo ""
echo "[UPDATE BETA] Atualização concluída."
echo "[UPDATE BETA] A pasta settings foi preservada."
