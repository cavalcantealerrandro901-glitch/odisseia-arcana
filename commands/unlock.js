const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Desbloqueia o canal atual instantaneamente.')
    .addStringOption(opt =>
      opt.setName('motivo')
        .setDescription('Motivo do desbloqueio')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  name: 'unlock',
  category: 'Moderação',
  description: 'Desbloqueia o canal atual permitindo o envio de mensagens.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;
    const channel = ctx.channel;

    const member = guild.members.cache.get(author.id);
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return ctx.reply({ content: '❌ Você precisa da permissão de **Gerenciar Canais** para usar este comando!', ephemeral: true });
    }

    let reason = 'Nenhum motivo especificado.';
    if (isSlash) {
      reason = ctx.options.getString('motivo') || reason;
    } else if (args.length > 0) {
      reason = args.join(' ');
    }

    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: null
      }, { reason: `Canal desbloqueado por ${author.tag} — Motivo: ${reason}` });

      const embed = new EmbedBuilder()
        .setTitle('🔓 Canal Desbloqueado')
        .setColor(0x2ecc71)
        .setDescription(`Este canal foi desbloqueado por ${author}.\n\n**Motivo:** ${reason}`)
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });

      // Enviar log automático
      try {
        const GuildConfig = mongoose.models.GuildConfig || mongoose.model('GuildConfig');
        const config = await GuildConfig.findOne({ guildId: guild.id });
        if (config && config.logChannelId) {
          const logChannel = guild.channels.cache.get(config.logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle('🔓 Canal Desbloqueado')
              .setColor(0x2ecc71)
              .addFields(
                { name: 'Canal', value: `${channel}`, inline: true },
                { name: 'Moderador', value: `${author} (\`${author.tag}\`)`, inline: true },
                { name: 'Motivo', value: reason, inline: false }
              )
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      } catch (logErr) {}

    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Ocorreu um erro ao tentar desbloquear este canal. Verifique minhas permissões.');
    }
  }
};
