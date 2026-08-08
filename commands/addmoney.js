const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const userEconomySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: { type: Number, default: 0 },
  lastNotified: { type: String, default: '' }
});
const UserEconomy = mongoose.models.UserEconomy || mongoose.model('UserEconomy', userEconomySchema);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('Adiciona moedas para um usuário (Apenas administradores).')
    .addUserOption(option =>
      option.setName('membro')
        .setDescription('O membro que receberá as moedas')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantidade')
        .setDescription('A quantidade de moedas a ser adicionada')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  name: 'addmoney',
  aliases: ['addmoedas'],
  category: 'Economia',
  description: 'Adiciona moedas ao saldo de um membro.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    let targetUser, amount;

    if (isSlash) {
      targetUser = ctx.options.getUser('membro');
      amount = ctx.options.getInteger('quantidade');
    } else {
      targetUser = ctx.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
      amount = parseInt(args[1]);
    }

    if (!targetUser) {
      return ctx.reply({ content: '❌ Você precisa mencionar ou fornecer o ID de um usuário válido.', ephemeral: true });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return ctx.reply({ content: '❌ Informe uma quantidade válida e maior que zero de moedas.', ephemeral: true });
    }

    let userData = await UserEconomy.findOne({ userId: targetUser.id, guildId: guild.id });
    if (!userData) {
      userData = new UserEconomy({ userId: targetUser.id, guildId: guild.id, balance: 500 });
    }

    userData.balance += amount;
    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle('🪙 Moedas Adicionadas com Sucesso!')
      .setColor(0x2ecc71)
      .setDescription(
        `O administrador **${author.username}** adicionou moedas para **${targetUser.username}**.\n\n` +
        `➕ **Quantidade Adicionada:** \`+${amount.toLocaleString()} moedas\`\n` +
        `💰 **Novo Saldo do Usuário:** \`${userData.balance.toLocaleString()} moedas\``
      )
      .setTimestamp();

    return ctx.reply({ embeds: [embed] });
  }
};
