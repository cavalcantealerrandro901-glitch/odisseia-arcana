const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

// Puxando o mesmo Schema de economia já utilizado
const UserEconomy = mongoose.models.UserEconomy || mongoose.model('UserEconomy', new mongoose.Schema({
  userId: String,
  guildId: String,
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 }
}));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Transfere almas para a carteira de outro membro.')
    .setNameLocalizations({
      'en-US': 'pay',
      'en-GB': 'pay'
    })
    .setDescriptionLocalizations({
      'en-US': 'Transfers souls to another member\'s wallet.',
      'en-GB': 'Transfers souls to another member\'s wallet.'
    })
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('O usuário que vai receber as almas')
        .setNameLocalizations({ 'en-US': 'user', 'en-GB': 'user' })
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantidade')
        .setDescription('A quantidade de almas a enviar')
        .setNameLocalizations({ 'en-US': 'amount', 'en-GB': 'amount' })
        .setRequired(true)
    ),
  name: 'pagar',
  aliases: ['pay', 'pix', 'transferir'],
  category: 'Economia',
  description: 'Transfere almas para outro usuário.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    let targetUser, amount;

    if (isSlash) {
      targetUser = ctx.options.getUser('usuario');
      amount = ctx.options.getInteger('quantidade');
      await ctx.deferReply(); // Dá mais tempo para o bot processar o banco de dados
    } else {
      targetUser = ctx.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
      amount = parseInt(args[1]);
    }

    // 1. Validações iniciais
    if (!targetUser) {
      const msg = '❌ Você precisa mencionar um usuário válido para transferir almas.';
      return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
    }
    if (targetUser.bot) {
      const msg = '🤖 Bots não possuem almas (nem carteira). Escolha um humano!';
      return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
    }
    if (targetUser.id === author.id) {
      const msg = '🔄 Você não pode fazer um pix para si mesmo!';
      return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      const msg = '❌ Informe uma quantidade válida de almas maior que zero.';
      return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
    }

    // 2. Buscar dados do remetente (quem está pagando)
    let senderData = await UserEconomy.findOne({ userId: author.id, guildId: guild.id });
    if (!senderData || senderData.balance < amount) {
      const msg = `💸 Você não tem almas suficientes na carteira para essa transferência. Seu saldo atual é de **${senderData?.balance || 0}** almas.`;
      return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
    }

    // 3. Buscar dados do destinatário (quem vai receber)
    let receiverData = await UserEconomy.findOne({ userId: targetUser.id, guildId: guild.id });
    if (!receiverData) {
      receiverData = await UserEconomy.create({ userId: targetUser.id, guildId: guild.id, balance: 0 });
    }

    // 4. Efetuar a transferência
    senderData.balance -= amount;
    receiverData.balance += amount;

    await senderData.save();
    await receiverData.save();

    // 5. Enviar confirmação
    const embed = new EmbedBuilder()
      .setTitle('💸 Transferência Concluída!')
      .setColor(0x2ecc71)
      .setDescription(`**${author.username}** enviou **${amount.toLocaleString()} almas** via PIX para **${targetUser.username}**!`)
      .addFields(
        { name: 'Seu saldo atual', value: `\`${senderData.balance.toLocaleString()} almas\``, inline: true },
        { name: 'Saldo de ' + targetUser.username, value: `\`${receiverData.balance.toLocaleString()} almas\``, inline: true }
      )
      .setTimestamp();

    if (isSlash) {
      return ctx.editReply({ embeds: [embed] });
    } else {
      return ctx.reply({ embeds: [embed] });
    }
  }
};
