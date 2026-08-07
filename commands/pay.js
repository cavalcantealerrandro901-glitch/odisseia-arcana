const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfere dinheiro para outro usuário.')
    .addUserOption(opt => opt.setName('usuario').setDescription('Destinatário').setRequired(true))
    .addIntegerOption(opt => opt.setName('valor').setDescription('Valor a transferir').setRequired(true)),
  name: 'pay',
  description: 'Transfere dinheiro para outro usuário.',
  async execute(ctx, client, isSlash, args = []) {
    const targetUser = isSlash 
      ? ctx.options.getUser('usuario')
      : ctx.mentions?.users?.first();

    const amount = isSlash 
      ? ctx.options.getInteger('valor')
      : parseInt(args[1], 10);

    const author = ctx.author || ctx.user;

    if (!targetUser) return ctx.reply({ content: '❌ Mencione ou selecione um usuário!' });
    if (targetUser.id === author.id) return ctx.reply({ content: '❌ Você não pode transferir para si mesmo!' });
    if (isNaN(amount) || amount <= 0) return ctx.reply({ content: '❌ Digite um valor válido!' });

    const wallet = ctx.member.wallet || 0;
    if (wallet < amount) return ctx.reply({ content: `❌ Saldo insuficiente na carteira ($${wallet.toLocaleString()}).` });

    const targetMember = ctx.guild.members.cache.get(targetUser.id);
    ctx.member.wallet -= amount;
    if (targetMember) targetMember.wallet = (targetMember.wallet || 0) + amount;

    const embed = new EmbedBuilder()
      .setTitle('💸 Transferência Realizada')
      .setColor('#57F287')
      .setDescription(`**${author.username}** enviou **$${amount.toLocaleString()}** para **${targetUser.username}**!`)
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
