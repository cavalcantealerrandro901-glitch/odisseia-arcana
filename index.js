const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Servidor Web para o Render
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('🤖 Odisseia Arcana - Online!');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor Web rodando na porta ${PORT}`);
});

// Instância do Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection();

const slashCommandsArray = [];

// Carregador Dinâmico de Comandos
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
        
        // Registra comando de Prefixo
        if (command.name) {
          client.commands.set(command.name.toLowerCase(), command);
          console.log(`✅ Prefixo: ${command.name} (${folder})`);

          if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => {
              client.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
            });
          }
        }

        // Registra comando Slash (se existir slashData)
        if (command.slashData) {
          client.slashCommands.set(command.slashData.name.toLowerCase(), command);
          slashCommandsArray.push(command.slashData.toJSON());
          console.log(`⚡ Slash: /${command.slashData.name} (${folder})`);
        }
      }
    }
  }
}

// Evento Ready + Registro de Slash Commands na API
client.once('ready', async () => {
  console.log(`🤖 ODISSEIA ARCANA online como: ${client.user.tag}`);

  // Registra os Slash Commands globalmente
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
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
});

// Evento de Mensagens (Comandos por Prefixo)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  let prefix = null;

  if (content.toLowerCase().startsWith('o.')) {
    prefix = content.slice(0, 2);
  }

  if (!prefix) return;

  const args = content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const cmdName = client.commands.has(commandName) 
    ? commandName 
    : client.aliases.get(commandName);

  const command = client.commands.get(cmdName);

  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`❌ Erro no comando ${commandName}:`, error);
    message.reply('❌ Ocorreu um erro ao executar este comando.');
  }
});

// Evento de Interação (Slash Commands)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.executeSlash(interaction, client);
  } catch (error) {
    console.error(`❌ Erro no Slash /${interaction.commandName}:`, error);
    const replyOptions = { content: '❌ Ocorreu um erro ao executar este comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
