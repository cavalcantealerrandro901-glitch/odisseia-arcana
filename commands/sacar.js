const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sacar')
    .setDescription('Saca dinheiro da conta bancária.')
    .addStringOption(opt => opt.setName('valor').setDescription('Valor ou "tudo"').setRequired(true)),
  name: 'sacar',
  category: 'Geral',
  description: 'Saca dinheiro da conta bancária.',
  async execute(ctx, client, isSlash, args = []) {
    const rawVal = isSlash ? ctx.options.getString('valor') : args[0];
    if (!rawVal) return ctx.reply({ content: '❌ Informe o valor ou "tudo"!' });

    const bank = ctx.member.bank || 0;
    let amount = rawVal.toLowerCase() === 'tudo' ? bank : parseInt(rawVal, 10);

    if (isNaN(amount) || amount <= 0) return ctx.reply({ content: '❌ Valor inválido!' });
    if (bank < amount) return ctx.reply({ content: `❌ Saldo insuficiente no banco ($${bank.toLocaleString()}).` });

    ctx.member.bank -= amount;
    ctx.member.wallet = (ctx.member.wallet || 0) + amount;

    const embed = new EmbedBuilder()
      .setTitle('💸 Saque Efetuado')
      .setColor('#E67E22')
      .setDescription(`Você sacou **$${amount.toLocaleString()}** do banco.`)
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
