#!/usr/bin/env bash
set -euo pipefail

# Instalador não destrutivo do SatBot.
REPO_URL="${SATBOT_REPO_URL:-https://github.com/Titannickbub/SatBot.git}"
BRANCH="${SATBOT_BRANCH:-main}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/satbot-install.XXXXXX")"
REPO_DIR="$TMP_DIR/repo"

cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "========================================"
echo "[INSTALL] Instalador do SatBot"
echo "[INSTALL] Repositório: $REPO_URL"
echo "[INSTALL] Destino: $ROOT_DIR"
echo "========================================"

if [ -f "$ROOT_DIR/index.js" ] && [ -f "$ROOT_DIR/package.json" ] &&
   [ -d "$ROOT_DIR/commands" ] && [ -d "$ROOT_DIR/functions" ]; then
    echo "[ERRO] Já existe uma instalação do SatBot neste diretório."
    echo "[INFO] Use update.sh para atualizar uma instalação existente."
    exit 1
fi

if ! command -v git >/dev/null 2>&1; then
    echo "[ERRO] Git não encontrado. Instale o Git ou disponibilize um clone do repositório."
    exit 1
fi

if ! git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$REPO_DIR" >/dev/null 2>&1; then
    echo "[ERRO] Não foi possível clonar o repositório."
    exit 1
fi

rm -rf "$REPO_DIR/.git"
rm -f "$REPO_DIR/install.sh" "$REPO_DIR/install.bat"

conflicts=()
while IFS= read -r -d '' source_file; do
    relative="${source_file#"$REPO_DIR"/}"
    case "$relative" in
        install.sh|install.bat) continue ;;
    esac
    if [ -e "$ROOT_DIR/$relative" ]; then
        conflicts+=("$relative")
    fi
done < <(find "$REPO_DIR" -type f -print0)

if [ "${#conflicts[@]}" -gt 0 ]; then
    echo "[ERRO] Instalação cancelada: existem arquivos conflitantes."
    printf ' - %s\n' "${conflicts[@]}"
    echo "[INFO] Nenhum arquivo foi alterado."
    exit 1
fi

cp -a "$REPO_DIR"/. "$ROOT_DIR"/

if ! command -v npm >/dev/null 2>&1; then
    echo "[AVISO] npm não encontrado. Instale o Node.js 18+ e execute npm install."
    exit 1
fi

echo "[INFO] Instalando dependências..."
npm install --no-audit --no-fund --no-progress

echo ""
echo "[INSTALL] Instalação concluída."
echo "[INFO] Para iniciar: bash start.sh"
