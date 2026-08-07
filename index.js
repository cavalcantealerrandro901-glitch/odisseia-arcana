const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Guild = require('./database/schemas/Guild');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
client.aliases = new Collection();
client.prefixes = new Map(); // Cache em memória RAM para prefixos

/**
 * Busca o prefixo em 0ms consultando a RAM.
 */
async function getPrefix(guildId, defaultPrefix = '!') {
  if (!guildId) return defaultPrefix;

  if (client.prefixes.has(guildId)) {
    return client.prefixes.get(guildId);
  }

  try {
    const guildData = await Guild.findOne({ guildId }).lean();
    const prefix = guildData?.prefix || defaultPrefix;
    client.prefixes.set(guildId, prefix);
    return prefix;
  } catch (err) {
    console.error('Erro ao buscar prefixo:', err.message);
    return defaultPrefix;
  }
}

// Carregamento dinâmico de comandos das pastas
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFolders = fs.readdirSync(commandsPath);
  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.lstatSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);

      if (command.name) {
        client.commands.set(command.name, command);
        if (command.aliases && Array.isArray(command.aliases)) {
          command.aliases.forEach(alias => client.aliases.set(alias, command.name));
        }
      }
    }
  }
}

// Evento de inicialização atualizado para clientReady
client.once('clientReady', () => {
  console.log(`⚡ Bot online e otimizado como: ${client.user.tag}`);
});

// Evento de Mensagens (Comandos por Prefixo)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const prefix = await getPrefix(message.guild.id);

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const cmdNameResolved = client.commands.has(commandName) 
    ? commandName 
    : client.aliases.get(commandName);

  const command = client.commands.get(cmdNameResolved);

  if (!command) return;

  try {
    await command.execute(message, args, client, prefix);
  } catch (error) {
    console.error(`❌ Erro no comando ${commandName}:`, error);
    message.reply('❌ Ocorreu um erro ao executar este comando.').catch(() => {});
  }
});

// Evento de Interações (Slash Commands, Modais e Botões)
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command && command.executeSlash) {
        await command.executeSlash(interaction, client);
      }
    }
  } catch (error) {
    console.error(`❌ Erro na interação:`, error);
    const errMessage = { content: '❌ Ocorreu um erro ao processar esta ação.', flags: [MessageFlags.Ephemeral] };
    
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errMessage).catch(() => {});
    } else {
      await interaction.reply(errMessage).catch(() => {});
    }
  }
});

// Conexão com o Banco de Dados e Login
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('🍃 Conectado ao MongoDB!'))
    .catch(err => console.error('❌ Erro de conexão com MongoDB:', err));
} else {
  console.warn('⚠️ Aviso: Nenhuma URL do MongoDB foi informada no .env');
}

client.login(TOKEN);
