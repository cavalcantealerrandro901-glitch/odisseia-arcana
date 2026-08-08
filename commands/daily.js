const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

function isNewDay(lastTimestamp) {
  if (!lastTimestamp) return true;
  const lastDate = new Date(lastTimestamp);
  const now = new Date();
  return now.toDateString() !== lastDate.toDateString();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Resgata sua recompensa diária com botão interativo e sequência de 2k a 60k.'),
  name: 'daily',
  aliases: ['diario'],
  category: 'Economia',
  description: 'Resgata a recompensa diária.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    let userData = await UserEconomy.findOne({ userId: author.id, guildId: guild.id });
    if (!userData) {
      userData = await UserEconomy.create({ userId: author.id, guildId: guild.id, balance: 500 });
    }

    const available = isNewDay(userData.lastDaily);
    const streak = userData.dailyStreak || 0;

    const embed = new EmbedBuilder()
      .setTitle('🎁 Central de Recompensas Diárias - Aeternos')
      .setDescription(
        `Olá, **${author.username}**!\n\n` +
        `🔥 **Sua Sequência Atual:** \`${streak} dia(s)\`\n` +
        `📊 **Status:** ${available ? '🟢 **Disponível para resgate!**' : '🔴 **Já coletado hoje. Volte à meia-noite!**'}\n\n` +
        `*Resgate todos os dias para acumular uma sequência épica e garantir prêmios de até **60.000 moedas**!*`
      )
      .setColor(available ? 0x2ecc71 : 0xe74c3c)
      .setThumbnail(author.displayAvatarURL())
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('claim_daily_btn')
        .setLabel(available ? '✨ Coletar Recompensa' : '⏳ Indisponível (Já Coletado)')
        .setStyle(available ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!available)
    );

    const response = await ctx.reply({ embeds: [embed], components: [row], fetchReply: true });

    if (!available) return;

    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === author.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'claim_daily_btn') {
        let freshData = await UserEconomy.findOne({ userId: author.id, guildId: guild.id });
        if (!freshData) {
          freshData = await UserEconomy.create({ userId: author.id, guildId: guild.id, balance: 500 });
        }

        if (!isNewDay(freshData.lastDaily)) {
          return await i.reply({ content: '❌ Você já resgatou sua recompensa hoje!', ephemeral: true });
        }

        if (freshData.lastDaily) {
          const lastDate = new Date(freshData.lastDaily);
          const now = new Date();
          const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
          const currentMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const diffDays = Math.round((currentMidnight - lastMidnight) / (1000 * 60 * 60 * 24));

          if (diffDays > 1) {
            freshData.dailyStreak = 1;
          } else {
            freshData.dailyStreak = (freshData.dailyStreak || 0) + 1;
          }
        } else {
          freshData.dailyStreak = 1;
        }

        let reward = 2000 + (freshData.dailyStreak - 1) * 2000;
        if (reward > 60000) reward = 60000;

        freshData.balance += reward;
        freshData.lastDaily = Date.now();
        freshData.lastNotified = new Date().toDateString();
        await freshData.save();

        const successEmbed = new EmbedBuilder()
          .setTitle('🎉 Recompensa Diária Coletada com Sucesso!')
          .setColor(0xf1c40f)
          .setDescription(
            `Parabéns, ${author}!\n\n` +
            `🪙 **Prêmio:** \`+${reward.toLocaleString()} moedas\`\n` +
            `🔥 **Sequência Atual:** \`${freshData.dailyStreak} dia(s)\`\n` +
            `💰 **Novo Saldo:** \`${freshData.balance.toLocaleString()} moedas\``
          )
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('claimed_done')
            .setLabel('✅ Resgatado Hoje')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await i.update({ embeds: [successEmbed], components: [disabledRow] });
        collector.stop();
      }
    });
  }
};
