const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

const userEconomySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: { type: Number, default: 0 }
});
const UserEconomy = mongoose.models.UserEconomy || mongoose.model('UserEconomy', userEconomySchema);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Resgata sua recompensa diária com sequência (streak) de 2k a 60k moedas.'),
  name: 'daily',
  aliases: ['diario'],
  category: 'Economia',
  description: 'Resgata a recompensa diária.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    let userData = await UserEconomy.findOne({ userId: author.id, guildId: guild.id });
    if (!userData) {
      userData = new UserEconomy({ userId: author.id, guildId: guild.id, balance: 500 });
    }

    const now = Date.now();
    const cooldownTime = 24 * 60 * 60 * 1000; // 24 horas
    const timeDiff = now - userData.lastDaily;

    if (userData.lastDaily && timeDiff < cooldownTime) {
      const timeLeft = cooldownTime - timeDiff;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return ctx.reply({ content: `⏳ Você já resgatou seu diário hoje! Volte em **${hours}h ${minutes}m** para resgatar novamente.`, ephemeral: true });
    }

    // Se passar de 48 horas sem resgatar, a sequência reseta para 1. Caso contrário, incrementa.
    if (userData.lastDaily && timeDiff > (cooldownTime * 2)) {
      userData.dailyStreak = 1;
    } else {
      userData.dailyStreak = (userData.dailyStreak || 0) + 1;
    }

    // Cálculo da recompensa: Começa em 2.000 e aumenta conforme o streak até o teto de 60.000
    let reward = 2000 + (userData.dailyStreak - 1) * 1500;
    if (reward > 60000) reward = 60000;

    userData.balance += reward;
    userData.lastDaily = now;
    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle('🎁 Recompensa Diária Resgatada!')
      .setColor(0xf1c40f)
      .setDescription(`Você garantiu sua recompensa de hoje com sucesso!`)
      .addFields(
        { name: '🪙 Recompensa', value: `\`🪙 ${reward.toLocaleString()} moedas\``, inline: true },
        { name: '🔥 Sequência', value: `\`${userData.dailyStreak} dia(s) seguidos\``, inline: true },
        { name: '💰 Saldo Atual', value: `\`🪙 ${userData.balance.toLocaleString()} moedas\``, inline: false }
      )
      .setFooter({ text: `Aeternos • Continue ativando todos os dias para maximizar seus ganhos!` })
      .setTimestamp();

    return ctx.reply({ embeds: [embed] });
  }
};
