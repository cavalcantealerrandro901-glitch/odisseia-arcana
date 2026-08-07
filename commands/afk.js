const { SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Fique ausente (AFK) com um motivo opcional.')
    .addStringOption(option =>
      option.setName('motivo')
        .setDescription('Motivo do AFK (opcional)')
        .setRequired(false)
    ),
  name: 'afk',
  category: 'Geral',
  aliases: ['ausente'],
  description: 'Fique ausente (AFK) com um motivo opcional.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const UserModel = mongoose.models.User;

    if (!UserModel) {
      return ctx.reply({ content: '❌ Erro ao conectar ao banco de dados.' });
    }

    let reason = 'Sem motivo informado';

    if (isSlash) {
      const inputReason = ctx.options.getString('motivo');
      if (inputReason) reason = inputReason;
    } else {
      if (args.length > 0) {
        reason = args.join(' ');
      }
    }

    let userData = await UserModel.findOne({ userId: author.id });
    if (!userData) {
      userData = await UserModel.create({ userId: author.id });
    }

    userData.afkReason = reason;
    userData.afkTimestamp = new Date();
    await userData.save();

    await ctx.reply(`💤 **${author.username}**, você agora está AFK: **${reason}**.\nAssim que você enviar uma nova mensagem, seu AFK será removido!`);
  }
};
