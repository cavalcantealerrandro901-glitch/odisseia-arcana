const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('depositar')
    .setDescription('Deposita dinheiro da carteira no banco.')
    .addStringOption(opt => opt.setName('valor').setDescription('Valor ou "tudo"').setRequired(true)),
  name: 'depositar',
  category: 'Geral',
  description: 'Deposita dinheiro da carteira no banco.',
  async execute(ctx, client, isSlash, args = []) {
    const rawVal = isSlash ? ctx.options.getString('valor') : args[0];
    if (!rawVal) return ctx.reply({ content: '❌ Informe o valor ou "tudo"!' });

    const wallet = ctx.member.wallet || 0;
    let amount = rawVal.toLowerCase() === 'tudo' ? wallet : parseInt(rawVal, 10);

    if (isNaN(amount) || amount <= 0) return ctx.reply({ content: '❌ Valor inválido!' });
    if (wallet < amount) return ctx.reply({ content: `❌ Saldo insuficiente na carteira ($${wallet.toLocaleString()}).` });

    ctx.member.wallet -= amount;
    ctx.member.bank = (ctx.member.bank || 0) + amount;

    const embed = new EmbedBuilder()
      .setTitle('🏦 Depósito Efetuado')
      .setColor('#57F287')
      .setDescription(`Você depositou **$${amount.toLocaleString()}** no banco.`)
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
