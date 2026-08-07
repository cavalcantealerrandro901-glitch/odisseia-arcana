require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');
const mongoose = require('mongoose');
const Guild = require('./models/Guild');

// 🌐 Servidor HTTP para o UptimeRobot
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('Bot online e rodando 24/7!');
  res.end();
}).listen(PORT, () => console.log(`🌐 Servidor Web ativo na porta ${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.commands = new Collection();
client.aliases = new Collection();

// 🍃 Conexão com o MongoDB
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🍃 Conectado ao MongoDB com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));
} else {
  console.warn('⚠️ MONGO_URI não foi configurada nas variáveis de ambiente!');
}

// 📂 Carregamento dinâmico de comandos
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

// 🚀 Evento Ready & Registro de Slash Commands
client.once('ready', async () => {
  console.log(`🤖 Bot online como ${client.user.tag}!`);

  const slashCommandsArray = [];
  client.commands.forEach(cmd => {
    if (cmd.slashData) {
      slashCommandsArray.push(cmd.slashData.toJSON());
    }
  });

  if (slashCommandsArray.length > 0) {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN || process.env.DISCORD_TOKEN);
    try {
      console.log('🔄 Registrando Slash Commands no Discord...');
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: slashCommandsArray }
      );
      console.log('✅ Slash Commands registrados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao registrar Slash Commands:', error);
    }
  }
});

// 💬 Evento de Mensagens (Comandos por Prefixo Dinâmico)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Busca o prefixo do servidor no banco de dados ou usa o padrão
  let guildConfig = await Guild.findOne({ guildId: message.guild.id });
  const prefix = guildConfig?.prefix || process.env.PREFIX || '!';

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

// ⚡ Evento de Interações (Slash Commands)
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
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Ocorreu um erro ao executar este comando!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
    } else {
      await interaction.reply({ content: '❌ Ocorreu um erro ao executar este comando!', flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }
  }
});

// 🔑 Login do Bot
const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ TOKEN do Discord não encontrado!');
} else {
  client.login(token);
}
