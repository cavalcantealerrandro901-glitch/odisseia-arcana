require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');
const mongoose = require('mongoose');
const Guild = require('./models/Guild');

// 🌐 Servidor HTTP
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('Bot online e operacional!');
  res.end();
}).listen(PORT, () => console.log(`🌐 Servidor Web ativo na porta ${PORT}`));

// 🤖 Instância do Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
client.aliases = new Collection();

// 🍃 Conexão com MongoDB
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🍃 Conectado ao MongoDB com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));
} else {
  console.warn('⚠️ MONGO_URI não foi configurada!');
}

// 📂 Carregamento de comandos
const commandsPath = path.join(__dirname, 'commands');

function carregarComandos(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      carregarComandos(fullPath);
    } else if (file.name.endsWith('.js')) {
      const command = require(fullPath);
      if (command.name) {
        client.commands.set(command.name, command);
        if (command.aliases && Array.isArray(command.aliases)) {
          command.aliases.forEach(alias => client.aliases.set(alias, command.name));
        }
      }
    }
  }
}

carregarComandos(commandsPath);
console.log(`📦 ${client.commands.size} comando(s) carregado(s)!`);

// 🚀 Evento Ready
client.once('clientReady', async () => {
  console.log(`🤖 Bot online como ${client.user.tag}!`);

  const slashCommandsArray = [];
  client.commands.forEach(cmd => {
    if (cmd.slashData) slashCommandsArray.push(cmd.slashData.toJSON());
  });

  if (slashCommandsArray.length > 0) {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN || process.env.DISCORD_TOKEN);
    try {
      await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommandsArray });
      console.log('✅ Slash Commands registrados!');
    } catch (error) {
      console.error('❌ Erro Slash Commands:', error);
    }
  }
});

// 💬 Evento de Mensagens (Comandos por Prefixo)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Prefixo padrão alterado para BOT_PREFIX (evita o conflito com o Termux)
  let prefix = process.env.BOT_PREFIX || '!';

  try {
    const guildConfig = await Guild.findOne({ guildId: message.guild.id });
    if (guildConfig && guildConfig.prefix) {
      prefix = guildConfig.prefix;
    }
  } catch (err) {
    console.error('⚠️ Erro ao buscar prefixo no MongoDB:', err.message);
  }

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));

  if (!command) return;

  try {
    if (command.execute) {
      await command.execute(message, args, client, prefix);
    }
  } catch (error) {
    console.error(`❌ Erro no comando ${commandName}:`, error);
    message.reply('❌ Ocorreu um erro ao executar este comando.').catch(() => {});
  }
});

// ⚡ Interações Slash
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    if (command.executeSlash) {
      await command.executeSlash(interaction, client);
    }
  } catch (error) {
    console.error(`❌ Erro no Slash Command ${interaction.commandName}:`, error);
  }
});

const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ TOKEN não configurado!');
} else {
  client.login(token);
}
