const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  PermissionFlagsBits 
} = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('desmutar')
    .setDescription('Remove o silenciamento (timeout) de um membro com confirmação.')
    .addUserOption(opt => 
      opt.setName('usuario')
        .setDescription('Usuário que deseja retirar o silenciamento')
        .setRequired(true))
    .addStringOption(opt => 
      opt.setName('motivo')
        .setDescription('Motivo da remoção do silenciamento')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'desmutar',
  aliases: ['unmute', 'removetimeout'],
  category: 'Moderação',
  description: 'Remove o silenciamento de um membro com confirmação e registro nos logs.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    const member = guild.members.cache.get(author.id);
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return ctx.reply({ content: '❌ Você não tem permissão para gerenciar silenciamentos!', ephemeral: true });
    }

    let targetUser = null;
    let reason = 'Nenhum motivo especificado.';

    if (isSlash) {
      targetUser = ctx.options.getUser('usuario');
      reason = ctx.options.getString('motivo') || reason;
    } else {
      if (ctx.mentions && ctx.mentions.users.size > 0) {
        targetUser = ctx.mentions.users.first();
      } else if (args[0]) {
        targetUser = client.users.cache.get(args[0].replace(/[<@!>]/g, ''));
      }
      if (args.length > 1) reason = args.slice(1).join(' ');
    }

    if (!targetUser) {
      return ctx.reply('❌ Você precisa mencionar um usuário válido!');
    }

    const targetMember = guild.members.cache.get(targetUser.id);
    if (!targetMember) {
      return ctx.reply('❌ Este usuário não está no servidor!');
    }

    if (!targetMember.isCommunicationDisabled()) {
      return ctx.reply('❌ Este usuário não está silenciado!');
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirmação de Remoção de Silenciamento')
      .setColor(0x3498db)
      .setDescription(`Deseja remover o silenciamento de **${targetUser.tag}**?\n\n**Motivo:** ${reason}`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_unmute')
        .setLabel('Confirmar Desmute')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔊'),
      new ButtonBuilder()
        .setCustomId('cancel_unmute')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✖️')
    );

    const replyMsg = await ctx.reply({
      embeds: [confirmEmbed],
      components: [row],
      fetchReply: true
    });

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: '❌ Apenas quem executou o comando pode interagir.', ephemeral: true });
      }

      if (interaction.customId === 'cancel_unmute') {
        const cancelEmbed = new EmbedBuilder()
          .setTitle('❌ Ação Cancelada')
          .setColor(0x95a5a6)
          .setDescription(`A remoção do silenciamento de **${targetUser.tag}** foi cancelada.`);
        await interaction.update({ embeds: [cancelEmbed], components: [] });
        collector.stop();
        return;
      }

      if (interaction.customId === 'confirm_unmute') {
        try {
          await targetMember.timeout(null, `Silenciamento removido por ${author.tag} — Motivo: ${reason}`);

          const successEmbed = new EmbedBuilder()
            .setTitle('🔊 Silenciamento Removido')
            .setColor(0x2ecc71)
            .setDescription(`O silenciamento de **${targetUser.tag}** foi removido com sucesso.\n\n**Motivo:** ${reason}`)
            .setTimestamp();

          await interaction.update({ embeds: [successEmbed], components: [] });

          // Enviar log automático
          try {
            const GuildConfig = mongoose.models.GuildConfig || mongoose.model('GuildConfig');
            const config = await GuildConfig.findOne({ guildId: guild.id });
            if (config && config.logChannelId) {
              const logChannel = guild.channels.cache.get(config.logChannelId);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setTitle('🔊 Silenciamento Removido (Unmute)')
                  .setColor(0x2ecc71)
                  .addFields(
                    { name: 'Usuário', value: `${targetUser} (\`${targetUser.tag}\`)`, inline: true },
                    { name: 'Moderador', value: `${author} (\`${author.tag}\`)`, inline: true },
                    { name: 'Motivo', value: reason, inline: false }
                  )
                  .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
              }
            }
          } catch (logErr) {
            console.error('Erro ao enviar log de unmute:', logErr);
          }

        } catch (err) {
          console.error(err);
          await interaction.update({ content: '❌ Não foi possível remover o silenciamento deste usuário.', embeds: [], components: [] });
        }
        collector.stop();
      }
    });

    collector.on('end', async (_, reasonTime) => {
      if (reasonTime === 'time') {
        try {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏰ Tempo Expirado')
            .setColor(0x7f8c8d)
            .setDescription('O tempo para confirmar a ação expirou.');
          await replyMsg.edit({ embeds: [timeoutEmbed], components: [] });
        } catch (e) {}
      }
    });
  }
};
