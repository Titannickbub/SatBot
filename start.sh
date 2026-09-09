#!/bin/bash

# ==================================================
# BOT COLD BOOT RUNNER
# ==================================================

BOT_NAME="$(node -e "const pkg=require('./package.json'); console.log(pkg.name || 'Sat Bot');" 2>/dev/null || true)"
BOT_VERSION="$(node -e "const pkg=require('./package.json'); console.log(pkg.version || '0.0.0');" 2>/dev/null || true)"
DEV_MODE="development"

echo ""
echo "=================================================="
echo "[BOOT] Bot: ${BOT_NAME:-Sat Bot}"
echo "[BOOT] Versão: ${BOT_VERSION:-0.0.0}"
echo "[BOOT] Ambiente: ${DEV_MODE}"
echo "[BOOT] Dados: settings/"
echo "=================================================="
echo ""
echo ""
echo "[INFO] Iniciando o bot com loop de auto-recuperação..."
echo ""

while true; do
    if [ ! -d "node_modules" ] || ! npm ls --depth=0 >/dev/null 2>&1; then
        echo "[INFO] Dependências ausentes ou desatualizadas. Instalando..."
        echo ""
        npm install --no-audit --no-fund --no-progress
        if [ $? -ne 0 ]; then
            echo "[ERRO] Não foi possível instalar as dependências."
            exit 1
        fi
    else
        echo "[INFO] Dependências verificadas."
    fi

    node index.js
    echo ""
    echo "[WATCHER] O processo do bot terminou. Reiniciando em 2 segundos..."
    echo ""
    sleep 2
done