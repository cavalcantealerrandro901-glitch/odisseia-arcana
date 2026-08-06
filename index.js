const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
require('dotenv').config();

// Servidor Web para manter o Render ativo
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('🤖 Odisseia Arcana - Online!');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor Web rodando na porta ${PORT}`);
});

// Bot do Discord básico
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`🤖 ODISSEIA ARCANA online como: ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === 'o.ping') {
    return message.reply(`🏓 **Pong!** Latência: **${client.ws.ping}ms**`);
  }
});

client.login(process.env.DISCORD_TOKEN);
