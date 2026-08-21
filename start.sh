#!/bin/bash

# ==================================================
# SATELLA BOT COLD BOOT RUNNER
# ==================================================

BOT_NAME="$(node -e "const pkg=require('./package.json'); console.log(pkg.name || 'Satella');" 2>/dev/null || true)"
BOT_VERSION="$(node -e "const pkg=require('./package.json'); console.log(pkg.version || '0.0.0');" 2>/dev/null || true)"
DEV_MODE="development"

echo ""
echo "=================================================="
echo "[BOOT] Bot: ${BOT_NAME:-Satella}"
echo "[BOOT] Versão: ${BOT_VERSION:-0.0.0}"
echo "[BOOT] Ambiente: ${DEV_MODE}"
echo "=================================================="
echo ""
echo "[INFO] Instalando dependências..."
echo ""
npm install

echo ""
echo "[INFO] Iniciando Satella com loop de auto-recuperação..."
echo ""

while true; do
    node index.js
    echo ""
    echo "[WATCHER] O processo do bot terminou. Reiniciando em 2 segundos..."
    echo ""
    sleep 2
done