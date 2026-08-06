const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');
require('dotenv').config();

// --- SERVIDOR WEB (Para manter o Web Service do Render ativo) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 Bot Odisseia Arcana está ativo!');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor Web rodando na porta ${PORT}`);
});

// --- CONFIGURAÇÃO DO BOT DISCORD ---
const PREFIX = 'o.';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Definindo comandos Slash (/)
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Responde com Pong e a latência!'),
  new SlashCommandBuilder().setName('ajuda').setDescription('Mostra a lista de comandos'),
];

// Registrando comandos Slash na API do Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerSlashCommands() {
  try {
    console.log('🔄 Atualizando comandos Slash (/)...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Comandos Slash registrados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos Slash:', error);
  }
}

// Evento: Bot pronto / online
client.once('ready', () => {
  console.log(`🤖 Bot online como: ${client.user.tag}`);
  registerSlashCommands();
});

// Evento: Mensagens com Prefixo (o.)
client.on('messageCreate', (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    return message.reply(`🏓 Pong! Latência: **${client.ws.ping}ms**`);
  }

  if (command === 'ajuda') {
    return message.reply('📜 **Comandos Disponíveis:**\n• `o.ping` ou `/ping` - Checa a latência\n• `o.ajuda` ou `/ajuda` - Menu de ajuda');
  }
});

// Evento: Interação com Comandos Slash (/)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply(`🏓 Pong! Latência: **${client.ws.ping}ms**`);
  } else if (commandName === 'ajuda') {
    await interaction.reply('📜 **Comandos Disponíveis:**\n• `o.ping` ou `/ping` - Checa a latência\n• `o.ajuda` ou `/ajuda` - Menu de ajuda');
  }
});

// Login do Bot
client.login(process.env.DISCORD_TOKEN);

