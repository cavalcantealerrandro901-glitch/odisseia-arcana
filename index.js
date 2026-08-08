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
    GatewayIntentBits.GuildModeration,
  ],
});

client.commands = new Collection();
client.aliases = new Collection();

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Schemas Globais
const afkSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  reason: String,
  timestamp: Number
});
const Afk = mongoose.models.Afk || mongoose.model('Afk', afkSchema);

const userEconomySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: { type: Number, default: 0 },
  lastWork: { type: Number, default: 0 },
  lastNotified: { type: String, default: '' }
});
const UserEconomy = mongoose.models.UserEconomy || mongoose.model('UserEconomy', userEconomySchema);

const logSchema = new mongoose.Schema({
  guildId: { type: String, unique: true },
  channelId: String
});
const LogConfig = mongoose.models.LogConfig || mongoose.model('LogConfig', logSchema);

// Dicionário de traduções automáticas para os comandos
const translations = {
  'ajuda': { en: 'help', desc: 'Shows the interactive help center.' },
  'work': { en: 'work', desc: 'Work to earn coins for your wallet.' },
  'addmoney': { en: 'addmoney', desc: 'Adds coins to a member balance.' },
  'perfil': { en: 'profile', desc: 'Displays your economy profile.' },
  'enviar': { en: 'send', desc: 'Sends an official message through the bot.' },
  'logs': { en: 'logs', desc: 'Configures the server log system.' },
  'limpar': { en: 'clear', desc: 'Clears messages from the channel.' }
};

// Carregar Comandos da pasta commands com automação de tradução
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') && !file.endsWith('.bak'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);

      // Automação: Injeta as localizações em inglês automaticamente
      if (command.data && translations[command.data.name]) {
        const t = translations[command.data.name];
        if (typeof command.data.setNameLocalizations === 'function') {
          command.data.setNameLocalizations({ 'en-US': t.en, 'en-GB': t.en });
        }
      }

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

// Função auxiliar para enviar logs
async function sendLog(guild, embed) {
  try {
    const config = await LogConfig.findOne({ guildId: guild.id });
    if (!config || !config.channelId) return;

    const logChannel = guild.channels.cache.get(config.channelId) || await guild.channels.fetch(config.channelId).catch(() => null);
    if (logChannel) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Erro ao enviar log:', err);
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

  // 🔔 Sistema de Notificação Automática no PV para o Daily (Dramático e Elegante)
  setInterval(async () => {
    try {
      const todayStr = new Date().toDateString();
      const allEconomy = await UserEconomy.find({});
      
      for (const data of allEconomy) {
        if (data.lastDaily) {
          const lastDate = new Date(data.lastDaily);
          const now = new Date();
          const isDifferentDay = now.toDateString() !== lastDate.toDateString();
          
          if (isDifferentDay && data.lastNotified !== todayStr) {
            try {
              const user = await client.users.fetch(data.userId).catch(() => null);
              if (user) {
                const dmEmbed = new EmbedBuilder()
                  .setTitle('⏳ As Areias do Destino Voltaram a Correr... ⚜️')
                  .setColor(0x9b59b6)
                  .setDescription(
                    `Nobre **${user.username}**,\n\n` +
                    `As brumas do tempo se dissiparam e o véu da meia-noite revelou o que há muito vos aguarda. ` +
                    `O tesouro das eras — a vossa sagrada recompensa diária — encontra-se novamente restaurado e pronto para ser reivindicado.\n\n` +
                    `🔥 **Sua Sequência Atual:** \`${data.dailyStreak || 0} dia(s) de inabalável devoção\`\n\n` +
                    `*Não permita que a chama da vossa constância se apague nas sombras do esquecimento. Retorne ao santuário do servidor e digite \`/daily\` para garantir vossa fortuna!*`
                  )
                  .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
                
                data.lastNotified = todayStr;
                await data.save();
              }
            } catch (dmErr) {
              // Ignora caso o usuário esteja com a DM fechada
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro no sistema de notificação dramática do Daily:', err);
    }
  }, 30 * 60 * 1000); // Verifica a cada 30 minutos
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

// Mensagens, Sistema de AFK, Comandos por Prefixo e Logs
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // 1. Sistema de AFK
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

  // 2. Comandos por Prefixo
  const prefix = process.env.PREFIX_BOT || '!';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
  
  if (!command) {
    return message.reply(`❌ O comando \`${prefix}${commandName}\` não existe. Use \`${prefix}ajuda\` para ver a lista de comandos!`);
  }

  try {
    await command.execute(message, client, false, args);
  } catch (error) {
    console.error(error);
    await message.reply('❌ Houve um erro ao executar este comando por prefixo!');
  }
});

// --- SISTEMA DE LOGS COMPLETO E ATUALIZADO ---

// 1. Mensagem Deletada
client.on('messageDelete', async message => {
  if (!message.guild || message.author?.bot) return;
  const embed = new EmbedBuilder()
    .setTitle('🗑️ Mensagem Deletada')
    .setColor(0xe74c3c)
    .addFields(
      { name: 'Autor', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
      { name: 'Canal', value: `${message.channel}`, inline: true },
      { name: 'Conteúdo', value: message.content ? (message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content) : '*[Vazio ou mídia]*', inline: false }
    )
    .setTimestamp();
  await sendLog(message.guild, embed);
});

// 2. Mensagem Editada
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  const embed = new EmbedBuilder()
    .setTitle('✏️ Mensagem Editada')
    .setColor(0xf1c40f)
    .addFields(
      { name: 'Autor', value: `${newMessage.author} (\`${newMessage.author.id}\`)`, inline: true },
      { name: 'Canal', value: `${newMessage.channel}`, inline: true },
      { name: 'Antes', value: oldMessage.content ? (oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1021) + '...' : oldMessage.content) : '*[Desconhecido]*', inline: false },
      { name: 'Depois', value: newMessage.content ? (newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content) : '*[Desconhecido]*', inline: false }
    )
    .setTimestamp();
  await sendLog(newMessage.guild, embed);
});

// 3. Alteração de Apelido ou Foto de Perfil (Avatar)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  // Apelido alterado
  if (oldMember.nickname !== newMember.nickname) {
    const embed = new EmbedBuilder()
      .setTitle('👤 Apelido Alterado')
      .setColor(0x3498db)
      .addFields(
        { name: 'Usuário', value: `${newMember.user} (\`${newMember.id}\`)`, inline: false },
        { name: 'Antigo Apelido', value: `\`${oldMember.nickname || oldMember.user.username}\``, inline: true },
        { name: 'Novo Apelido', value: `\`${newMember.nickname || newMember.user.username}\``, inline: true }
      )
      .setTimestamp();
    await sendLog(newMember.guild, embed);
  }
});

client.on('userUpdate', async (oldUser, newUser) => {
  // Foto de perfil alterada
  if (oldUser.avatar !== newUser.avatar) {
    // Busca em quais guilds o usuário está para notificar os logs corretos
    for (const [, guild] of client.guilds.cache) {
      if (guild.members.cache.has(newUser.id)) {
        const embed = new EmbedBuilder()
          .setTitle('🖼️ Foto de Perfil Alterada')
          .setColor(0x9b59b6)
          .setDescription(`O usuário **${newUser.tag}** (\`${newUser.id}\`) alterou sua foto de perfil.`)
          .setThumbnail(newUser.displayAvatarURL({ dynamic: true, size: 512 }))
          .setTimestamp();
        await sendLog(guild, embed);
      }
    }
  }
});

// 4. Membro Banido
client.on('guildBanAdd', async ban => {
  const embed = new EmbedBuilder()
    .setTitle('🔨 Membro Banido')
    .setColor(0xc0392b)
    .addFields({ name: 'Usuário', value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: false })
    .setTimestamp();
  await sendLog(ban.guild, embed);
});

// 5. Membro Expulso (Kick) ou Saiu do Servidor
client.on('guildMemberRemove', async member => {
  try {
    const fetchedLogs = await member.guild.fetchAuditLogs({
      limit: 1,
      type: 20, // MEMBER_KICK
    });
    const kickLog = fetchedLogs.entries.first();

    if (kickLog && kickLog.target.id === member.id && (Date.now() - kickLog.createdTimestamp < 5000)) {
      const embed = new EmbedBuilder()
        .setTitle('👢 Membro Expulso (Kick)')
        .setColor(0xe67e22)
        .addFields(
          { name: 'Usuário', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
          { name: 'Moderador', value: `${kickLog.executor} (\`${kickLog.executor.id}\`)`, inline: true },
          { name: 'Motivo', value: kickLog.reason || 'Nenhum motivo informado.', inline: false }
        )
        .setTimestamp();
      await sendLog(member.guild, embed);
    }
  } catch (err) {
    // Ignora se não houver permissão de audit log
  }
});

// 6. Criação e Exclusão de Canal
client.on('channelCreate', async channel => {
  if (!channel.guild) return;
  const embed = new EmbedBuilder()
    .setTitle('📁 Canal Criado')
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Nome', value: `${channel.name} (\`${channel.id}\`)`, inline: true },
      { name: 'Tipo', value: `${channel.type}`, inline: true }
    )
    .setTimestamp();
  await sendLog(channel.guild, embed);
});

client.on('channelDelete', async channel => {
  if (!channel.guild) return;
  const embed = new EmbedBuilder()
    .setTitle('🗑️ Canal Excluído')
    .setColor(0xe74c3c)
    .addFields({ name: 'Nome', value: `${channel.name} (\`${channel.id}\`)`, inline: true })
    .setTimestamp();
  await sendLog(channel.guild, embed);
});

// 7. Canal Editado
client.on('channelUpdate', async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;
  let changes = [];
  if (oldChannel.name !== newChannel.name) changes.push(`**Nome:** \`${oldChannel.name}\` ➔ \`${newChannel.name}\``);
  if (oldChannel.topic !== newChannel.topic) changes.push(`**Tópico alterado.**`);
  if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push(`**Modo lento alterado.**`);

  if (changes.length > 0) {
    const embed = new EmbedBuilder()
      .setTitle('🛠️ Canal Editado')
      .setColor(0x3498db)
      .addFields(
        { name: 'Canal', value: `${newChannel} (\`${newChannel.id}\`)`, inline: false },
        { name: 'Modificações', value: changes.join('\n'), inline: false }
      )
      .setTimestamp();
    await sendLog(newChannel.guild, embed);
  }
});

// 8. Criação e Exclusão de Cargo
client.on('roleCreate', async role => {
  const embed = new EmbedBuilder()
    .setTitle('✨ Cargo Criado')
    .setColor(0x2ecc71)
    .addFields({ name: 'Nome', value: `${role.name} (\`${role.id}\`)`, inline: true })
    .setTimestamp();
  await sendLog(role.guild, embed);
});

client.on('roleDelete', async role => {
  const embed = new EmbedBuilder()
    .setTitle('❌ Cargo Excluído')
    .setColor(0xe74c3c)
    .addFields({ name: 'Nome', value: `${role.name} (\`${role.id}\`)`, inline: true })
    .setTimestamp();
  await sendLog(role.guild, embed);
});

client.login(process.env.DISCORD_TOKEN);
