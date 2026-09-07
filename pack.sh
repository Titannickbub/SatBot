#!/usr/bin/env bash
set -euo pipefail

# ==================================================
# SCRIPT DE COMPACTAÇÃO DO SATBOT (LINUX / BASH)
# ==================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BOT_VERSION="$(node -e "const pkg=require('./package.json'); console.log(pkg.version || '');" 2>/dev/null || grep -o '"version": "[^"]*"' package.json 2>/dev/null | cut -d'"' -f4 || echo "")"

if [ -n "${1:-}" ]; then
    OUTPUT_ZIP="$1"
elif [ -n "$BOT_VERSION" ]; then
    OUTPUT_ZIP="satbot_${BOT_VERSION}.zip"
else
    OUTPUT_ZIP="satbot_release.zip"
fi

echo ""
echo "=================================================="
echo "[PACK] Criando pacote: $OUTPUT_ZIP"
echo "=================================================="
echo ""

# Lista de pastas e arquivos solicitados
ITEMS=(
    "changelog"
    "commands"
    "docs"
    "functions"
    "middlewares"
    "platforms"
    "core.js"
    "index.js"
    "install.bat"
    "install.sh"
    "package.json"
    "README.md"
    "start.bat"
    "start.sh"
    "update.bat"
    "update.sh"
)

EXISTING_ITEMS=()

for item in "${ITEMS[@]}"; do
    if [ -e "$item" ]; then
        EXISTING_ITEMS+=("$item")
        echo " [+] $item"
    else
        echo " [-] $item (não encontrado, ignorado)"
    fi
done

if [ ${#EXISTING_ITEMS[@]} -eq 0 ]; then
    echo ""
    echo "[ERRO] Nenhum arquivo ou pasta correspondente foi encontrado para compactar."
    exit 1
fi

echo ""
echo "[INFO] Compactando arquivos..."

rm -f "$OUTPUT_ZIP"

if command -v zip >/dev/null 2>&1; then
    zip -q -r "$OUTPUT_ZIP" "${EXISTING_ITEMS[@]}"
elif command -v 7z >/dev/null 2>&1; then
    7z a "$OUTPUT_ZIP" "${EXISTING_ITEMS[@]}" >/dev/null
elif command -v python3 >/dev/null 2>&1; then
    python3 -c "
import zipfile, os, sys
output = sys.argv[1]
items = sys.argv[2:]
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as z:
    for item in items:
        if os.path.isdir(item):
            for root, dirs, files in os.walk(item):
                for file in files:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path)
                    z.write(full_path, rel_path)
        elif os.path.isfile(item):
            z.write(item, item)
" "$OUTPUT_ZIP" "${EXISTING_ITEMS[@]}"
else
    echo "[ERRO] Nenhum utilitário de compressão encontrado (zip, 7z ou python3)."
    exit 1
fi

echo ""
echo "=================================================="
echo "[SUCESSO] Pacote criado com sucesso:"
echo "          $ROOT_DIR/$OUTPUT_ZIP"
echo "=================================================="
echo ""
