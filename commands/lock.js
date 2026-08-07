const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Bloqueia o canal atual instantaneamente.')
    .addStringOption(opt =>
      opt.setName('motivo')
        .setDescription('Motivo do bloqueio')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  name: 'lock',
  category: 'Moderação',
  description: 'Bloqueia o canal atual para impedir o envio de mensagens.',
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
        SendMessages: false
      }, { reason: `Canal bloqueado por ${author.tag} — Motivo: ${reason}` });

      const embed = new EmbedBuilder()
        .setTitle('🔒 Canal Bloqueado')
        .setColor(0xe74c3c)
        .setDescription(`Este canal foi bloqueado por ${author}.\n\n**Motivo:** ${reason}`)
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
              .setTitle('🔒 Canal Bloqueado')
              .setColor(0xe74c3c)
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
      await ctx.reply('❌ Ocorreu um erro ao tentar bloquear este canal. Verifique minhas permissões.');
    }
  }
};
