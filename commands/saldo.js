const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Veja o seu saldo ou o saldo de outro usuário.')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Usuário para verificar o saldo (opcional)')
        .setRequired(false)
    ),
  name: 'saldo',
  category: 'Geral',
  aliases: ['bal', 'atm', 'carteira', 'banco', 'ver-saldo', 'versaldo'],
  description: 'Veja o seu saldo ou o saldo de outro usuário.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const UserModel = mongoose.models.User;

    if (!UserModel) {
      return ctx.reply({ content: '❌ Erro ao conectar ao banco de dados.' });
    }

    // Identifica o alvo (próprio usuário ou mencionado)
    let targetUser = author;

    if (isSlash) {
      const optionUser = ctx.options.getUser('usuario');
      if (optionUser) targetUser = optionUser;
    } else {
      if (ctx.mentions && ctx.mentions.users.first()) {
        targetUser = ctx.mentions.users.first();
      } else if (args[0]) {
        try {
          const fetched = await client.users.fetch(args[0]);
          if (fetched) targetUser = fetched;
        } catch (e) {}
      }
    }

    // Busca dados no MongoDB
    let userData = await UserModel.findOne({ userId: targetUser.id });
    if (!userData) {
      userData = await UserModel.create({ userId: targetUser.id });
    }

    const wallet = userData.wallet || 0;
    const bank = userData.bank || 0;
    const debt = userData.debt || 0;
    const netWorth = wallet + bank - debt;

    const isSelf = targetUser.id === author.id;

    const embed = new EmbedBuilder()
      .setTitle(isSelf ? '💰 Seu Extrato Financeiro' : `💰 Extrato Financeiro de ${targetUser.username}`)
      .setColor('#5865F2')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '💵 Carteira', value: `\`$${wallet.toLocaleString()}\``, inline: true },
        { name: '🏦 Banco', value: `\`$${bank.toLocaleString()}\``, inline: true },
        { name: '🛑 Dívida Bancária', value: `\`$${debt.toLocaleString()}\``, inline: true },
        { name: '📊 Patrimônio Líquido', value: `\`$${netWorth.toLocaleString()}\``, inline: false }
      )
      .setFooter({ text: `Solicitado por ${author.username} • Prefixo: ${ctx.prefix || '!'}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
