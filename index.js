const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Database } = require('st.db');
const fs = require('fs');
const path = require('path');

const dbConfig = new Database({ filePath: './database/config.json' });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

// Função para carregar comandos recursivamente das pastas
function carregarComandos(dir) {
  const arquivos = fs.readdirSync(dir);
  for (const arquivo of arquivos) {
    const caminho = path.join(dir, arquivo);
    const stat = fs.statSync(caminho);
    if (stat.isDirectory()) {
      carregarComandos(caminho);
    } else if (arquivo.endsWith('.js')) {
      const cmd = require(caminho);
      if (cmd.name) {
        client.commands.set(cmd.name, cmd);
      }
    }
  }
}

if (fs.existsSync('./commands')) {
  carregarComandos('./commands');
}

// Carregar Eventos e Logs
if (fs.existsSync('./events/logsEvents.js')) {
  require('./events/logsEvents')(client);
}

client.once('ready', () => {
  console.log(`🤖 Bot online com sucesso como ${client.user.tag}!`);
});

// Manipulador de Mensagens com Prefixo Dinâmico
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const prefixoPadrao = 'O.';
  const prefixoServidor = (await dbConfig.get(`prefix_${message.guild.id}`)) || prefixoPadrao;

  if (!message.content.startsWith(prefixoServidor)) return;

  const args = message.content.slice(prefixoServidor.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || 
                  client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`Erro ao executar o comando ${commandName}:`, error);
    message.reply('❌ Ocorreu um erro ao executar este comando.');
  }
});

// Manipulador de Comandos Slash (/)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command || !command.executeSlash) return;

  try {
    await command.executeSlash(interaction, client);
  } catch (error) {
    console.error(`Erro ao executar o slash command ${interaction.commandName}:`, error);
    const msgErro = '❌ Ocorreu um erro ao executar este comando por barra.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: msgErro, ephemeral: true });
    } else {
      await interaction.reply({ content: msgErro, ephemeral: true });
    }
  }
});

// Substitua pelo seu token ou certifique-se de que ele está no seu .env / config
client.login(process.env.TOKEN || 'SEU_TOKEN_AQUI');
