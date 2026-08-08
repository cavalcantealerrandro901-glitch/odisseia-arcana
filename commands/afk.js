const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

const afkSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  reason: String,
  timestamp: Number
});
const Afk = mongoose.models.Afk || mongoose.model('Afk', afkSchema);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Deixa você ausente (AFK) e avisa quem te mencionar.')
    .addStringOption(option =>
      option.setName('motivo')
        .setDescription('O motivo de você estar ausente')
        .setRequired(false)
    ),
  name: 'afk',
  aliases: ['ausente'],
  category: 'Utilidade',
  description: 'Define seu status como AFK.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    const reason = isSlash 
      ? (ctx.options.getString('motivo') || 'Nenhum motivo informado.') 
      : (args.join(' ') || 'Nenhum motivo informado.');

    // Salva ou atualiza o status de AFK no MongoDB
    await Afk.findOneAndUpdate(
      { userId: author.id, guildId: guild.id },
      { reason, timestamp: Date.now() },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setTitle('💤 Status AFK Ativado')
      .setColor(0xe67e22)
      .setDescription(`Tudo bem, **${author.username}**! Agora você está marcado como **AFK**.\n\n📝 **Motivo:** ${reason}`)
      .setTimestamp();

    return ctx.reply({ embeds: [embed] });
  }
};
