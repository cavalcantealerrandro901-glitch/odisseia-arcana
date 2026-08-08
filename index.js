require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Servidor web para o Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).send('Aeternos Bot está online e operacional!');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor web ouvindo na porta ${PORT}`);
});

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

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Schema do AFK integrado
const afkSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  reason: String,
  timestamp: Number
});
const Afk = mongoose.models.Afk || mongoose.model('Afk', afkSchema);

// Carregar Comandos da pasta commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') && !file.endsWith('.bak'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        if (command.aliases && Array.isArray(command.aliases)) {
          command.aliases.forEach(alias => client.aliases.set(alias, command.data.name));
        }
        console.log(`📁 Comando carregado: ${command.data.name}`);
      } else {
        console.log(`⚠️ O comando em ${filePath} está sem 'data' ou 'execute'.`);
      }
    } catch (err) {
      console.error(`❌ Erro ao carregar o arquivo de comando ${file}:`, err);
    }
  }
}

client.on('clientReady', async () => {
  console.log(`🤖 Bot Aeternos ligado como ${client.user.tag}!`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const commandsData = client.commands.map(cmd => cmd.data.toJSON());

  try {
    console.log('🔄 Atualizando Slash Commands (/)...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commandsData },
    );
    console.log('✅ Comandos Slash registrados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos slash:', error);
  }
});

// Interações (Slash Commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client, true);
  } catch (error) {
    console.error(error);
    const errorMsg = { content: '❌ Houve um erro ao executar este comando!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg);
    } else {
      await interaction.reply(errorMsg);
    }
  }
});

// Mensagens, Sistema de AFK e Comandos por Prefixo
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // 1. Sistema de AFK (Remover ao falar)
  try {
    const userAfk = await Afk.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (userAfk) {
      await Afk.deleteOne({ userId: message.author.id, guildId: message.guild.id });
      const welcomeBackEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setDescription(`👋 Bem-vindo de volta, ${message.author}! Seu status de AFK foi removido.`);
      const msgBack = await message.reply({ embeds: [welcomeBackEmbed] });
      setTimeout(() => msgBack.delete().catch(() => {}), 5000);
    }

    // 2. Sistema de AFK (Avisar se mencionou alguém AFK)
    if (message.mentions.users.size > 0) {
      for (const [id, user] of message.mentions.users) {
        const targetAfk = await Afk.findOne({ userId: id, guildId: message.guild.id });
        if (targetAfk) {
          const timeAgo = Math.floor((Date.now() - targetAfk.timestamp) / 1000);
          const minutes = Math.floor(timeAgo / 60);
          const hours = Math.floor(minutes / 60);
          
          let tempoStr = `${timeAgo} segundos`;
          if (hours > 0) tempoStr = `${hours} hora(s)`;
          else if (minutes > 0) tempoStr = `${minutes} minuto(s)`;

          const afkNoticeEmbed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle(`💤 ${user.username} está AFK`)
            .setDescription(`**Motivo:** ${targetAfk.reason}\n**Ausente há:** ${tempoStr}`);
          
          await message.reply({ embeds: [afkNoticeEmbed] });
        }
      }
    }
  } catch (afkErr) {
    console.error('Erro no sistema AFK:', afkErr);
  }

  // 3. Comandos por Prefixo e Tratamento de Erros/Comando Inexistente
  const prefix = process.env.PREFIX_BOT || '!';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
  
  if (!command) {
    return message.reply(`❌ O comando \`${prefix}${commandName}\` não existe. Use \`${prefix}ajuda\` (ou o comando \`/ajuda\`) para ver a lista completa de comandos disponíveis!`);
  }

  try {
    await command.execute(message, client, false, args);
  } catch (error) {
    console.error(error);
    await message.reply('❌ Houve um erro ao executar este comando por prefixo!');
  }
});

client.login(process.env.DISCORD_TOKEN);
