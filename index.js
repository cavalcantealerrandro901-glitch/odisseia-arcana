cat << 'EOF' > index.js
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
require('dotenv').config();

// Servidor Web necessário para o Render manter o bot ligado
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('🤖 Bot Odisseia Arcana Online!');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor Web rodando na porta ${PORT}`);
});

// Configuração do Bot no Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', () => {
  console.log(`🤖 Bot online como: ${client.user.tag}`);
});

// Resposta ao comando o.ping
client.on('messageCreate', (message) => {
  if (message.author.bot || !message.content.startsWith('o.')) return;

  const args = message.content.slice(2).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    return message.reply(`🏓 Pong! Latência: **${client.ws.ping}ms**`);
  }
});

client.login(process.env.DISCORD_TOKEN);
EOF

