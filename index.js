const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();

// 1. Criar Servidor Web para o Render (Porta 10000 ou PORT do ambiente)
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('Aeternus Bot está online e ativo!');
  res.end();
}).listen(PORT, () => {
  console.log(`🌐 Servidor Web rodando na porta ${PORT}`);
});

// 2. Inicializar Cliente do Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
const slashCommandsArray = [];

// 3. Carregamento Automático de Comandos
const categoriesPath = path.join(__dirname, 'commands');
if (fs.existsSync(categoriesPath)) {
  const categoryFolders = fs.readdirSync(categoriesPath);

  for (const folder of categoryFolders) {
    const folderPath = path.join(categoriesPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if ('name' in command && ('execute' in command || 'executeSlash' in command)) {
          client.commands.set(command.name, command);

          // Registra apelidos (aliases) se existirem
          if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => client.commands.set(alias, command));
          }

          if (command.slashData) {
            slashCommandsArray.push(command.slashData.toJSON());
          }
        }
      }
    }
  }
}

// 4. Evento Ready: Registrar Slash Commands na API do Discord
client.once('ready', async () => {
  console.log(`🤖 Bot ${client.user.tag} conectado com sucesso!`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('⚡ Registrando comandos Slash (/)...');
    // Registra apenas as definições únicas (sem duplicar por alias)
    const comandosUnicos = Array.from(
      new Map(slashCommandsArray.map(cmd => [cmd.name, cmd])).values()
    );

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: comandosUnicos }
    );
    console.log(`✅ ${comandosUnicos.length} comandos Slash registrados!`);
  } catch (error) {
    console.error('❌ Erro ao registrar Slash Commands:', error);
  }
});

// 5. Tratar Comandos por Prefixo (O. e o.)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const prefixes = ['O.', 'o.'];
  const prefix = prefixes.find(p => message.content.startsWith(p));
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);

  if (!command || !command.execute) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(error);
    message.reply('❌ Ocorreu um erro ao executar este comando.');
  }
});

// 6. Tratar Interações Slash (/)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command || !command.executeSlash) return;

  try {
    await command.executeSlash(interaction, client);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Ocorreu um erro ao executar este comando!', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Ocorreu um erro ao executar este comando!', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

// Carregar Sistema de Logs
require('./events/logsEvents')(client);
