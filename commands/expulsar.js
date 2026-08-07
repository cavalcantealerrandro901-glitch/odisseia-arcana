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
    .setName('expulsar')
    .setDescription('Expulsa um membro do servidor com painel de confirmação.')
    .addUserOption(opt => 
      opt.setName('usuario')
        .setDescription('Usuário que deseja expulsar')
        .setRequired(true))
    .addStringOption(opt => 
      opt.setName('motivo')
        .setDescription('Motivo da expulsão')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  name: 'expulsar',
  aliases: ['kick'],
  category: 'Moderação',
  description: 'Expulsa um membro com confirmação e registro nos logs.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    const member = guild.members.cache.get(author.id);
    if (!member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return ctx.reply({ content: '❌ Você não tem permissão para expulsar membros!', ephemeral: true });
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
      if (args.length > 1) {
        reason = args.slice(1).join(' ');
      }
    }

    if (!targetUser) {
      return ctx.reply('❌ Você precisa mencionar ou fornecer o ID de um usuário válido para expulsar!');
    }

    const targetMember = guild.members.cache.get(targetUser.id);
    if (!targetMember) {
      return ctx.reply('❌ Este usuário não está no servidor!');
    }

    if (targetMember.id === author.id) {
      return ctx.reply('❌ Você não pode expulsar a si mesmo!');
    }

    if (targetMember.id === client.user.id) {
      return ctx.reply('❌ Você não pode me expulsar!');
    }

    // Criar Embed de Confirmação
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirmação de Expulsão')
      .setColor(0xe67e22)
      .setDescription(`Você tem certeza que deseja expulsar o usuário **${targetUser.tag}** (\`${targetUser.id}\`)?\n\n**Motivo:** ${reason}`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_kick')
        .setLabel('Confirmar Expulsão')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('👢'),
      new ButtonBuilder()
        .setCustomId('cancel_kick')
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
        return interaction.reply({ content: '❌ Apenas quem executou o comando pode interagir com estes botões.', ephemeral: true });
      }

      if (interaction.customId === 'cancel_kick') {
        const cancelEmbed = new EmbedBuilder()
          .setTitle('❌ Expulsão Cancelada')
          .setColor(0x95a5a6)
          .setDescription(`A expulsão de **${targetUser.tag}** foi cancelada.`);
        
        await interaction.update({ embeds: [cancelEmbed], components: [] });
        collector.stop();
        return;
      }

      if (interaction.customId === 'confirm_kick') {
        try {
          await guild.members.kick(targetUser.id, { reason: `Expulso por ${author.tag} — Motivo: ${reason}` });

          const successEmbed = new EmbedBuilder()
            .setTitle('👢 Usuário Expulso com Sucesso')
            .setColor(0x2ecc71)
            .setDescription(`O usuário **${targetUser.tag}** foi expulso do servidor.\n\n**Motivo:** ${reason}`)
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
                  .setTitle('👢 Usuário Expulso (Kick)')
                  .setColor(0xe67e22)
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
            console.error('Erro ao enviar log de kick:', logErr);
          }

        } catch (err) {
          console.error(err);
          await interaction.update({ content: '❌ Não foi possível expulsar este usuário. Verifique minhas permissões e se o cargo dele é inferior ao meu.', embeds: [], components: [] });
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
            .setDescription('O tempo para confirmar a expulsão expirou.');
          await replyMsg.edit({ embeds: [timeoutEmbed], components: [] });
        } catch (e) {}
      }
    });
  }
};
