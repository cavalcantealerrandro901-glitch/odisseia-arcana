const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  guildId: { type: String, unique: true },
  channelId: String
});
const LogConfig = mongoose.models.LogConfig || mongoose.model('LogConfig', logSchema);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configura o canal onde o Aeternos enviará os logs do servidor.')
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('O canal de texto para onde vão os registros')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  name: 'logs',
  category: 'Moderação',
  description: 'Configura o canal de logs.',
  async execute(ctx, client, isSlash, args = []) {
    const guild = ctx.guild;
    const channel = isSlash ? ctx.options.getChannel('canal') : (ctx.mentions.channels.first() || guild.channels.cache.get(args[0]));

    if (!channel) {
      return ctx.reply({ content: '❌ Você precisa selecionar ou mencionar um canal válido para os logs.', ephemeral: true });
    }

    await LogConfig.findOneAndUpdate(
      { guildId: guild.id },
      { channelId: channel.id },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setTitle('🛠️ Canal de Logs Configurado')
      .setColor(0x2ecc71)
      .setDescription(`Com sucesso! Todos os eventos de moderação e alterações serão enviados para ${channel}.`)
      .setTimestamp();

    return ctx.reply({ embeds: [embed] });
  }
};
