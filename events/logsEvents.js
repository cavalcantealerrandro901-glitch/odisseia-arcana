const { EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/config.json' });

module.exports = (client) => {
  // Função auxiliar para buscar o canal configurado
  async function getLogChannel(guild) {
    if (!guild) return null;
    const channelId = await db.get(`logs_channel_${guild.id}`);
    if (!channelId) return null;
    return guild.channels.cache.get(channelId) || null;
  }

  // 1. MENSAGEM DELETADA
  client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;

    const channel = await getLogChannel(message.guild);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Mensagem Apagada')
      .setColor('#e74c3c')
      .setThumbnail(message.author?.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Autor:', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
        { name: 'Canal:', value: `${message.channel}`, inline: true },
        { name: 'Conteúdo:', value: message.content ? `\`\`\`${message.content.slice(0, 1000)}\`\`\`` : '*Mensagem sem conteúdo de texto (apenas imagem/embed)*' }
      )
      .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
  });

  // 2. MENSAGEM EDITADA
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const channel = await getLogChannel(oldMessage.guild);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Mensagem Editada')
      .setColor('#f1c40f')
      .setThumbnail(oldMessage.author?.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Autor:', value: `${oldMessage.author} (\`${oldMessage.author.id}\`)`, inline: true },
        { name: 'Canal:', value: `${oldMessage.channel}`, inline: true },
        { name: 'Antes:', value: oldMessage.content ? `\`\`\`${oldMessage.content.slice(0, 1000)}\`\`\`` : '*Nenhum conteúdo*' },
        { name: 'Depois:', value: newMessage.content ? `\`\`\`${newMessage.content.slice(0, 1000)}\`\`\`` : '*Nenhum conteúdo*' }
      )
      .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
  });

  // 3. ALTERAÇÃO DE NICKNAME / CARGOS NO MEMBRO
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const channel = await getLogChannel(newMember.guild);
    if (!channel) return;

    // Troca de Nickname
    if (oldMember.nickname !== newMember.nickname) {
      const oldNick = oldMember.nickname || oldMember.user.username;
      const newNick = newMember.nickname || newMember.user.username;

      const embed = new EmbedBuilder()
        .setTitle('🏷️ Nickname Alterado')
        .setColor('#3498db')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Membro:', value: `${newMember.user} (\`${newMember.id}\`)` },
          { name: 'Antigo:', value: `\`${oldNick}\``, inline: true },
          { name: 'Novo:', value: `\`${newNick}\``, inline: true }
        )
        .setTimestamp();

      channel.send({ embeds: [embed] }).catch(() => {});
    }
  });

  // 4. ALTERAÇÃO DE AVATAR DO USUÁRIO
  client.on('userUpdate', async (oldUser, newUser) => {
    if (oldUser.avatar === newUser.avatar) return;

    // Procura por todos os servidores em comum onde as logs estão ativas
    client.guilds.cache.forEach(async (guild) => {
      if (guild.members.cache.has(newUser.id)) {
        const channel = await getLogChannel(guild);
        if (!channel) return;

        const embed = new EmbedBuilder()
          .setTitle('🖼️ Avatar Alterado')
          .setColor('#9b59b6')
          .setThumbnail(newUser.displayAvatarURL({ dynamic: true }))
          .setDescription(`O usuário **${newUser.tag}** (\`${newUser.id}\`) alterou sua foto de perfil.`)
          .setImage(newUser.displayAvatarURL({ dynamic: true, size: 512 }))
          .setTimestamp();

        channel.send({ embeds: [embed] }).catch(() => {});
      }
    });
  });
};
