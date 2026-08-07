require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { Database } = require('st.db');
const fs = require('fs');
const path = require('path');
const iniciarServidor = require('./server');

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

// 1. Função para carregar os arquivos de comandos localmente
function carregarComandos(dir) {
  const arquivos = fs.readdirSync(dir);
  for (const arquivo of arquivos) {
    const caminho = path.resolve(dir, arquivo);
    const stat = fs.statSync(caminho);
    if (stat.isDirectory()) {
      carregarComandos(caminho);
    } else if (arquivo.endsWith('.js')) {
      delete require.cache[require.resolve(caminho)];
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

// 2. Função para registrar os comandos Slash na API do Discord
async function autoDeploySlash() {
  const slashArray = [];

  // Varrer comandos para pegar a estrutura do Slash
  client.commands.forEach(cmd => {
    if (cmd.slashData) {
      slashArray.push(cmd.slashData.toJSON());
    }
  });

  if (slashArray.length === 0) return;

  const token = process.env.TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (!token || !clientId) {
    console.warn('⚠️ CLIENT_ID ou TOKEN ausentes no .env. Pulos no registro automatico de Slash.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`🔄 [AUTO-DEPLOY] Atualizando ${slashArray.length} comandos Slash (/) no Discord...`);
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: slashArray }
    );
    console.log('✅ [AUTO-DEPLOY] Todos os comandos Slash foram sincronizados com sucesso!');
  } catch (error) {
    console.error('❌ [AUTO-DEPLOY] Erro ao sincronizar comandos Slash:', error);
  }
}

// 3. Eventos e Inicialização
if (fs.existsSync('./events/logsEvents.js')) {
  require('./events/logsEvents')(client);
}

client.once('ready', async () => {
  console.log(`🤖 Bot online com sucesso como ${client.user.tag}!`);
  
  // Registra os Slash Commands automaticamente ao ligar
  await autoDeploySlash();
  
  // Inicia o servidor web (Express)
  if (typeof iniciarServidor === 'function') {
    iniciarServidor();
  }
});

// 4. Manipulador de Mensagens por Prefixo
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
    console.error(`Erro ao executar ${commandName}:`, error);
    message.reply('❌ Ocorreu um erro ao executar este comando.');
  }
});

// 5. Manipulador de Comandos Slash (/)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command || !command.executeSlash) return;

  try {
    await command.executeSlash(interaction, client);
  } catch (error) {
    console.error(`Erro ao executar slash ${interaction.commandName}:`, error);
    const msg = '❌ Ocorreu um erro ao executar este comando por barra.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: msg, ephemeral: true });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
