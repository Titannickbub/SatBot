#!/bin/bash

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "[ERRO] Node.js e npm precisam estar instalados no Termux."
    exit 1
fi

echo "[INFO] Instalando as dependências do bot..."
npm install --no-audit --no-fund --no-progress
if [ $? -ne 0 ]; then
    echo "[ERRO] Não foi possível instalar as dependências do bot."
    exit 1
fi

echo "[INFO] Instalando o sharp para Android..."
npm install --cpu=wasm32 sharp
if [ $? -ne 0 ]; then
    echo "[ERRO] Não foi possível instalar o sharp para Android."
    exit 1
fi

npm install @img/sharp-wasm32
if [ $? -ne 0 ]; then
    echo "[ERRO] Não foi possível instalar @img/sharp-wasm32."
    exit 1
fi

echo "[INFO] Iniciando o bot..."
while true; do
    node index.js
    echo ""
    echo "[WATCHER] O processo do bot terminou. Reiniciando em 2 segundos..."
    sleep 2
done
