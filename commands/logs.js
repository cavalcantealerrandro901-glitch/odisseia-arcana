const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  guildId: { type: String, unique: true },
  channelId: String
});
const LogConfig = mongoose.models.LogConfig || mongoose.model('LogConfig', logSchema);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configura ou desativa o canal de logs do servidor (Apenas Administradores).')
    .addStringOption(option =>
      option.setName('acao')
        .setDescription('Escolha se deseja definir um canal ou desativar os logs')
        .setRequired(true)
        .addChoices(
          { name: 'Definir Canal', value: 'set' },
          { name: 'Desativar Logs', value: 'disable' }
        )
    )
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('O canal onde os logs serão enviados (obrigatório se for definir)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  name: 'logs',
  aliases: ['logconfig'],
  category: 'Administração',
  description: 'Configura o sistema de logs do servidor.',
  async execute(ctx, client, isSlash, args = []) {
    const guild = ctx.guild;

    let action, targetChannel;

    if (isSlash) {
      action = ctx.options.getString('acao');
      targetChannel = ctx.options.getChannel('canal');
    } else {
      // Prefixo: !logs set #canal ou !logs desativar
      action = args[0]?.toLowerCase();
      if (action === 'set' || action === 'definir') {
        action = 'set';
        targetChannel = ctx.mentions.channels.first() || guild.channels.cache.get(args[1]);
      } else if (action === 'disable' || action === 'desativar') {
        action = 'disable';
      } else {
        return ctx.reply({ content: '❌ Uso correto por prefixo: `!logs set #canal` ou `!logs desativar`', ephemeral: true });
      }
    }

    if (action === 'set') {
      if (!targetChannel) {
        return ctx.reply({ content: '❌ Você precisa especificar um canal de texto válido para definir os logs.', ephemeral: true });
      }

      await LogConfig.findOneAndUpdate(
        { guildId: guild.id },
        { channelId: targetChannel.id },
        { upsert: true, new: true }
      );

      const embed = new EmbedBuilder()
        .setTitle('🛠️ Sistema de Logs Configurado')
        .setColor(0x2ecc71)
        .setDescription(`O canal de logs foi definido com sucesso para ${targetChannel}!`)
        .setTimestamp();

      return ctx.reply({ embeds: [embed] });
    } else if (action === 'disable') {
      await LogConfig.findOneAndDelete({ guildId: guild.id });

      const embed = new EmbedBuilder()
        .setTitle('🛠️ Sistema de Logs Desativado')
        .setColor(0xe74c3c)
        .setDescription('O sistema de logs deste servidor foi desativado com sucesso.')
        .setTimestamp();

      return ctx.reply({ embeds: [embed] });
    }
  }
};
