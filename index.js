const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 1. Servidor Express para manter o Render ligado
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('🤖 Odisseia Arcana Online!');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor Web rodando na porta ${PORT}`);
});

// 2. Cliente do Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

// 3. Handler Dinâmico de Comandos (Lê todas as subpastas da pasta 'commands')
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        if ('name' in command && 'execute' in command) {
          client.commands.set(command.name.toLowerCase(), command);
          console.log(`✅ Comando carregado: ${command.name} (${folder})`);
        }
      }
    }
  }
}

// 4. Evento Ready
client.once('ready', () => {
  console.log(`🤖 ODISSEIA ARCANA online como: ${client.user.tag}`);
});

// 5. Execução de Comandos (Prefixos O. e o.)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  let prefix = null;
  if (message.content.startsWith('O.')) prefix = 'O.';
  else if (message.content.startsWith('o.')) prefix = 'o.';

  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);

  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`Erro ao executar o comando ${commandName}:`, error);
    message.reply('❌ Ocorreu um erro ao executar este comando.');
  }
});

client.login(process.env.DISCORD_TOKEN);
