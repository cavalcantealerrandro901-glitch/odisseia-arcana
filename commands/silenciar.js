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

// Helper para converter tempo (ex: 10m, 1h, 1d) em milissegundos
function parseDuration(durationStr) {
  if (!durationStr) return 60 * 60 * 1000; // Padrão: 1 hora
  const match = durationStr.match(/^(\d+)([mhdse])$/);
  if (!match) return 60 * 60 * 1000;
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('silenciar')
    .setDescription('Silencia (timeout) um membro do servidor com confirmação.')
    .addUserOption(opt => 
      opt.setName('usuario')
        .setDescription('Usuário que deseja silenciar')
        .setRequired(true))
    .addStringOption(opt => 
      opt.setName('tempo')
        .setDescription('Duração (ex: 10m, 1h, 1d)')
        .setRequired(false))
    .addStringOption(opt => 
      opt.setName('motivo')
        .setDescription('Motivo do silenciamento')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'silenciar',
  aliases: ['mute', 'timeout'],
  category: 'Moderação',
  description: 'Silencia um membro com confirmação e registro nos logs.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    const member = guild.members.cache.get(author.id);
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return ctx.reply({ content: '❌ Você não tem permissão para silenciar membros!', ephemeral: true });
    }

    let targetUser = null;
    let durationStr = '1h';
    let reason = 'Nenhum motivo especificado.';

    if (isSlash) {
      targetUser = ctx.options.getUser('usuario');
      durationStr = ctx.options.getString('tempo') || '1h';
      reason = ctx.options.getString('motivo') || reason;
    } else {
      if (ctx.mentions && ctx.mentions.users.size > 0) {
        targetUser = ctx.mentions.users.first();
      } else if (args[0]) {
        targetUser = client.users.cache.get(args[0].replace(/[<@!>]/g, ''));
      }
      if (args[1]) durationStr = args[1];
      if (args.length > 2) reason = args.slice(2).join(' ');
    }

    if (!targetUser) {
      return ctx.reply('❌ Você precisa mencionar um usuário válido para silenciar!');
    }

    const targetMember = guild.members.cache.get(targetUser.id);
    if (!targetMember) {
      return ctx.reply('❌ Este usuário não está no servidor!');
    }

    if (targetMember.id === author.id) {
      return ctx.reply('❌ Você não pode silenciar a si mesmo!');
    }

    if (targetMember.id === client.user.id) {
      return ctx.reply('❌ Você não pode me silenciar!');
    }

    const durationMs = parseDuration(durationStr);

    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirmação de Silenciamento')
      .setColor(0xf39c12)
      .setDescription(`Deseja realmente silenciar **${targetUser.tag}** por **${durationStr}**?\n\n**Motivo:** ${reason}`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_mute')
        .setLabel('Confirmar Silenciamento')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔇'),
      new ButtonBuilder()
        .setCustomId('cancel_mute')
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

      if (interaction.customId === 'cancel_mute') {
        const cancelEmbed = new EmbedBuilder()
          .setTitle('❌ Silenciamento Cancelado')
          .setColor(0x95a5a6)
          .setDescription(`O silenciamento de **${targetUser.tag}** foi cancelado.`);
        await interaction.update({ embeds: [cancelEmbed], components: [] });
        collector.stop();
        return;
      }

      if (interaction.customId === 'confirm_mute') {
        try {
          await targetMember.timeout(durationMs, `Silenciado por ${author.tag} — Motivo: ${reason}`);

          const successEmbed = new EmbedBuilder()
            .setTitle('🔇 Membro Silenciado')
            .setColor(0xe67e22)
            .setDescription(`O usuário **${targetUser.tag}** foi silenciado por **${durationStr}**.\n\n**Motivo:** ${reason}`)
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
                  .setTitle('🔇 Usuário Silenciado (Timeout)')
                  .setColor(0xe67e22)
                  .addFields(
                    { name: 'Usuário', value: `${targetUser} (\`${targetUser.tag}\`)`, inline: true },
                    { name: 'Moderador', value: `${author} (\`${author.tag}\`)`, inline: true },
                    { name: 'Duração', value: durationStr, inline: true },
                    { name: 'Motivo', value: reason, inline: false }
                  )
                  .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
              }
            }
          } catch (logErr) {
            console.error('Erro ao enviar log de mute:', logErr);
          }

        } catch (err) {
          console.error(err);
          await interaction.update({ content: '❌ Não foi possível silenciar este usuário. Verifique minhas permissões e cargos.', embeds: [], components: [] });
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
            .setDescription('O tempo para confirmar o silenciamento expirou.');
          await replyMsg.edit({ embeds: [timeoutEmbed], components: [] });
        } catch (e) {}
      }
    });
  }
};
