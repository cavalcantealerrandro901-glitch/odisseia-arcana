const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('carteira')
    .setDescription('Exibe seu saldo da carteira e do banco.')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuário para consultar')),
  name: 'carteira',
  category: 'Geral',
  description: 'Exibe seu saldo da carteira e do banco.',
  async execute(ctx, client, isSlash, args = []) {
    const targetUser = isSlash 
      ? (ctx.options.getUser('usuario') || ctx.user)
      : (ctx.mentions?.users?.first() || ctx.author);

    const targetMember = ctx.guild.members.cache.get(targetUser.id) || ctx.member;

    const wallet = targetMember.wallet || 0;
    const bank = targetMember.bank || 0;

    const embed = new EmbedBuilder()
      .setTitle(`👛 Finanças de ${targetUser.username}`)
      .setColor('#FEE75C')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '💵 Carteira', value: `\`$${wallet.toLocaleString()}\``, inline: true },
        { name: '🏦 Banco', value: `\`$${bank.toLocaleString()}\``, inline: true },
        { name: '💰 Patrimônio Total', value: `\`$${(wallet + bank).toLocaleString()}\``, inline: false }
      )
      .setFooter({ text: `Prefixo: ${ctx.prefix || '!'}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
