require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];

function carregarSlash(dir) {
  const arquivos = fs.readdirSync(dir);
  for (const arquivo of arquivos) {
    const caminho = path.resolve(dir, arquivo);
    const stat = fs.statSync(caminho);
    if (stat.isDirectory()) {
      carregarSlash(caminho);
    } else if (arquivo.endsWith('.js')) {
      delete require.cache[require.resolve(caminho)];
      const cmd = require(caminho);
      if (cmd.slashData) {
        commands.push(cmd.slashData.toJSON());
      }
    }
  }
}

if (fs.existsSync('./commands')) {
  carregarSlash('./commands');
}

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ ERRO: Adicione TOKEN e CLIENT_ID no seu arquivo .env!');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`🔄 Atualizando ${commands.length} comandos Slash (/)...`);

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log('✅ Todos os comandos Slash foram registrados com sucesso no Discord!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos Slash:', error);
  }
})();
