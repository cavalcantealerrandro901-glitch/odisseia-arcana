const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra a lista de comandos disponíveis do bot em inglês.'),
  name: 'help',
  aliases: ['ajudaglobal'],
  category: 'Utilidade',
  description: 'Central de ajuda do bot.',
  async execute(ctx, client, isSlash, args = []) {
    const embed = new EmbedBuilder()
      .setTitle('📖 Central de Ajuda (Help)')
      .setColor(0x3498db)
      .setDescription('Use `/ajuda` para ver os comandos em português ou digite `!ajuda` no chat.')
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
