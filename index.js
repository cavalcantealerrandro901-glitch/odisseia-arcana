const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

client.commands = new Collection();

// Carregar Comandos Dinamicamente
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const slashCommandsArray = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    slashCommandsArray.push(command.data.toJSON());
  } else if ('name' in command && 'execute' in command) {
    client.commands.set(command.name, command);
  }
}

// Conexão com o MongoDB (Usa variável de ambiente do Render/Termux ou string padrão)
const MONGO_URI = process.env.MONGO_URI || 'SUA_URL_DO_MONGODB_AQUI';

client.once('ready', async () => {
  console.log(`🤖 Bot ligado como ${client.user.tag}!`);

  try {
    await mongoose.connect(MONGO_URI);
    console.log('📦 Conectado ao MongoDB com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
  }

  // Registrar Slash Commands Globalmente
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('🔄 Atualizando Slash Commands (/)...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashCommandsArray },
    );
    console.log('✨ Slash Commands registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }
});

// Manipulador de Slash Commands e Botões
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client, true);
    } catch (error) {
      console.error(error);
      const errReply = { content: '❌ Ocorreu um erro ao executar este comando!', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errReply);
      } else {
        await interaction.reply(errReply);
      }
    }
  }
});

// Manipulador de Comandos por Prefixo (!)
const PREFIX = '!';
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
  if (!command) return;

  try {
    await command.execute(message, client, false, args);
  } catch (error) {
    console.error(error);
    message.reply('❌ Ocorreu um erro ao executar este comando!');
  }
});

// --- SISTEMA DE LOGS AUTOMÁTICOS ---
async function sendLog(guild, embed) {
  try {
    const GuildConfig = mongoose.models.GuildConfig || mongoose.model('GuildConfig');
    const config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config || !config.logChannelId) return;

    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (logChannel) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (e) {
    console.error('Erro ao enviar log:', e);
  }
}

client.on('messageDelete', async (message) => {
  if (!message.guild || message.author?.bot) return;
  const embed = new EmbedBuilder()
    .setTitle('🗑️ Mensagem Deletada')
    .setColor(0xe74c3c)
    .addFields(
      { name: 'Autor', value: `${message.author} (\`${message.author.tag}\`)`, inline: true },
      { name: 'Canal', value: `${message.channel}`, inline: true },
      { name: 'Conteúdo', value: message.content ? message.content.substring(0, 1024) : '*[Conteúdo vazio / Mídia]*' }
    )
    .setTimestamp();
  await sendLog(message.guild, embed);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot || oldMessage.content === newMessage.content) return;
  const embed = new EmbedBuilder()
    .setTitle('✏️ Mensagem Editada')
    .setColor(0xf39c12)
    .addFields(
      { name: 'Autor', value: `${oldMessage.author} (\`${oldMessage.author.tag}\`)`, inline: false },
      { name: 'Canal', value: `${oldMessage.channel}`, inline: false },
      { name: 'Antiga', value: oldMessage.content ? oldMessage.content.substring(0, 512) : '*[Vazio]*', inline: false },
      { name: 'Nova', value: newMessage.content ? newMessage.content.substring(0, 512) : '*[Vazio]*', inline: false }
    )
    .setTimestamp();
  await sendLog(oldMessage.guild, embed);
});

client.on('guildMemberRemove', async (member) => {
  const embed = new EmbedBuilder()
    .setTitle('📤 Membro Saiu / Expulso')
    .setColor(0xe67e22)
    .setDescription(`O membro **${member.user.tag}** (\`${member.user.id}\`) saiu do servidor.`)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();
  await sendLog(member.guild, embed);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (oldMember.nickname !== newMember.nickname) {
    const embed = new EmbedBuilder()
      .setTitle('📝 Apelido (Nick) Alterado')
      .setColor(0x3498db)
      .setDescription(`Usuário: ${newMember.user} (\`${newMember.user.tag}\`)`)
      .addFields(
        { name: 'Antigo Nick', value: oldMember.nickname || oldMember.user.username, inline: true },
        { name: 'Novo Nick', value: newMember.nickname || newMember.user.username, inline: true }
      )
      .setTimestamp();
    await sendLog(newMember.guild, embed);
  }
});

client.on('channelCreate', async (channel) => {
  if (!channel.guild) return;
  const embed = new EmbedBuilder()
    .setTitle('📁 Canal Criado')
    .setColor(0x2ecc71)
    .setDescription(`O canal **${channel.name}** (\`${channel.type}\`) foi criado.`)
    .setTimestamp();
  await sendLog(channel.guild, embed);
});

client.on('channelDelete', async (channel) => {
  if (!channel.guild) return;
  const embed = new EmbedBuilder()
    .setTitle('📁 Canal Deletado')
    .setColor(0xe74c3c)
    .setDescription(`O canal **${channel.name}** foi deletado.`)
    .setTimestamp();
  await sendLog(channel.guild, embed);
});

client.on('roleCreate', async (role) => {
  const embed = new EmbedBuilder()
    .setTitle('🏷️ Cargo Criado')
    .setColor(0x2ecc71)
    .setDescription(`O cargo **${role.name}** foi criado.`)
    .setTimestamp();
  await sendLog(role.guild, embed);
});

client.on('roleDelete', async (role) => {
  const embed = new EmbedBuilder()
    .setTitle('🏷️ Cargo Deletado')
    .setColor(0xe74c3c)
    .setDescription(`O cargo **${role.name}** foi deletado.`)
    .setTimestamp();
  await sendLog(role.guild, embed);
});

// Login do Bot usando variável de ambiente
client.login(process.env.DISCORD_TOKEN);
