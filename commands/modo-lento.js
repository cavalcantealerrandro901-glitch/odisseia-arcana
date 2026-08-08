const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

// Função para converter o tempo informado em segundos
function parseSlowmode(durationStr) {
  if (!durationStr || durationStr === '0' || durationStr === 0) return 0;
  if (!isNaN(durationStr)) return parseInt(durationStr);

  const match = durationStr.toString().toLowerCase().match(/^(\d+)([smhd])$/);
  if (!match) return parseInt(durationStr) || 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return value;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modo-lento')
    .setDescription('Define ou desativa o modo lento no canal atual.')
    .addStringOption(opt =>
      opt.setName('tempo')
        .setDescription('Tempo (ex: 5s, 1m, 10 ou 0 para desativar)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  name: 'modo-lento',
  aliases: ['slowmode', 'slow'],
  category: 'Moderação',
  description: 'Define ou desativa o modo lento de um canal.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;
    const channel = ctx.channel;

    const member = guild.members.cache.get(author.id);
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return ctx.reply({ content: '❌ Você precisa da permissão de **Gerenciar Canais** para usar este comando!', ephemeral: true });
    }

    let timeArg = '0';
    if (isSlash) {
      timeArg = ctx.options.getString('tempo');
    } else if (args.length > 0) {
      timeArg = args[0];
    }

    const seconds = parseSlowmode(timeArg);

    // Limite máximo do Discord é de 6 horas (21600 segundos)
    if (seconds > 21600) {
      return ctx.reply({ content: '❌ O tempo máximo permitido para o modo lento é de 6 horas (21600 segundos)!', ephemeral: true });
    }

    try {
      await channel.setRateLimitPerUser(seconds, `Modo lento alterado por ${author.tag}`);

      let embed;
      if (seconds === 0) {
        embed = new EmbedBuilder()
          .setTitle('🐢 Modo Lento Desativado')
          .setColor(0x2ecc71)
          .setDescription(`O modo lento deste canal foi desativado por ${author}.`)
          .setTimestamp();
      } else {
        embed = new EmbedBuilder()
          .setTitle('🐢 Modo Lento Ativado')
          .setColor(0x3498db)
          .setDescription(`O modo lento deste canal foi definido para **${seconds} segundos** por ${author}.`)
          .setTimestamp();
      }

      await ctx.reply({ embeds: [embed] });

      // Enviar log automático
      try {
        const GuildConfig = mongoose.models.GuildConfig || mongoose.model('GuildConfig');
        const config = await GuildConfig.findOne({ guildId: guild.id });
        if (config && config.logChannelId) {
          const logChannel = guild.channels.cache.get(config.logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle(seconds === 0 ? '🐢 Modo Lento Desativado' : '🐢 Modo Lento Ativado')
              .setColor(seconds === 0 ? 0x2ecc71 : 0x3498db)
              .addFields(
                { name: 'Canal', value: `${channel}`, inline: true },
                { name: 'Moderador', value: `${author} (\`${author.tag}\`)`, inline: true },
                { name: 'Duração', value: seconds === 0 ? 'Desativado (0s)' : `${seconds}s`, inline: false }
              )
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      } catch (logErr) {}

    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Ocorreu um erro ao tentar alterar o modo lento. Verifique minhas permissões.');
    }
  }
};
