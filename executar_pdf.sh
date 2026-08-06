#!/bin/bash

# Pega automaticamente o arquivo PDF mais recente da pasta Download
PDF_FILE=$(ls -t /sdcard/Download/*.pdf 2>/dev/null | head -n 1)

if [ -z "$PDF_FILE" ]; then
    echo "Erro: Nenhum arquivo PDF encontrado na pasta Download!"
    exit 1
fi

echo "📄 Processando o PDF: $PDF_FILE"

# 1. Converte PDF para texto
pdftotext "$PDF_FILE" texto_extraido.txt

# 2. A IA lê o texto e gera o código JavaScript
cat texto_extraido.txt | tgpt -q "Analise as instruções deste texto e atualize ou crie o código JavaScript (Node.js) correspondente para o bot de Discord. Não inclua explicações fora do código." > index.js

# 3. Envia as atualizações para o GitHub
git add .
git commit -m "Atualização do bot via PDF automático"
git push origin main

echo "🚀 Atualização enviada para o GitHub! O Render vai atualizar o bot em breve."

