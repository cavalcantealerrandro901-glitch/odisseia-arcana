const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

// Tabela dos 7 Cargos, Recompensas e Requisitos de XP
const RANKS = [
  { level: 1, title: '🧹 Estagiário(a)', minPay: 200, maxPay: 500, minXp: 15, maxXp: 25, requiredXp: 100 },
  { level: 2, title: '📋 Assistente Operacional', minPay: 600, maxPay: 1200, minXp: 20, maxXp: 30, requiredXp: 250 },
  { level: 3, title: '💻 Analista Pleno', minPay: 1500, maxPay: 3000, minXp: 25, maxXp: 35, requiredXp: 500 },
  { level: 4, title: '👔 Gerente de Setor', minPay: 3500, maxPay: 6500, minXp: 30, maxXp: 45, requiredXp: 1000 },
  { level: 5, title: '📈 Diretor(a) Executivo(a)', minPay: 7000, maxPay: 12000, minXp: 40, maxXp: 55, requiredXp: 2000 },
  { level: 6, title: '💎 Vice-Presidente', minPay: 13000, maxPay: 22000, minXp: 50, maxXp: 70, requiredXp: 4000 },
  { level: 7, title: '👑 CEO / Sócio Majoritário', minPay: 25000, maxPay: 45000, minXp: 60, maxXp: 80, requiredXp: Infinity }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabalhe para ganhar salário, XP e subir na carreira profissional.'),
  name: 'work',
  category: 'Geral',
  aliases: ['trabalhar', 'job'],
  description: 'Trabalhe para ganhar salário, XP e subir na carreira profissional.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const UserModel = mongoose.models.User;

    if (!UserModel) {
      return ctx.reply({ content: '❌ Erro ao conectar ao banco de dados.' });
    }

    let userData = await UserModel.findOne({ userId: author.id });
    if (!userData) {
      userData = await UserModel.create({ userId: author.id });
    }

    const now = new Date();
    const cooldown = 20 * 60 * 1000; // 20 minutos
    const lastWork = userData.lastWork ? new Date(userData.lastWork) : null;

    if (lastWork && (now - lastWork) < cooldown) {
      const remaining = cooldown - (now - lastWork);
      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      const cdEmbed = new EmbedBuilder()
        .setTitle('⏳ Cansaço de Turno!')
        .setColor('#ED4245')
        .setDescription(`Você precisa descansar antes de encarar o próximo turno de trabalho.\n\n⏱️ **Retorno em:** \`${minutes}m ${seconds}s\``)
        .setTimestamp();

      return ctx.reply({ embeds: [cdEmbed] });
    }

    // Identifica o cargo atual do usuário
    let currentLevel = userData.workLevel || 1;
    if (currentLevel < 1) currentLevel = 1;
    if (currentLevel > 7) currentLevel = 7;

    const rank = RANKS[currentLevel - 1];

    // Sorteio de Salário e XP
    const payGained = Math.floor(Math.random() * (rank.maxPay - rank.minPay + 1)) + rank.minPay;
    const xpGained = Math.floor(Math.random() * (rank.maxXp - rank.minXp + 1)) + rank.minXp;

    userData.wallet += payGained;
    userData.workXp = (userData.workXp || 0) + xpGained;
    userData.lastWork = now;
    userData.workNotified = false;

    // Checagem de Promoção / Subida de Cargo
    let leveledUp = false;
    let nextRankTitle = rank.title;

    if (currentLevel < 7 && userData.workXp >= rank.requiredXp) {
      userData.workXp -= rank.requiredXp;
      userData.workLevel += 1;
      currentLevel += 1;
      leveledUp = true;
      nextRankTitle = RANKS[currentLevel - 1].title;
    }

    await userData.save();

    const activeRank = RANKS[currentLevel - 1];
    const xpProgress = activeRank.requiredXp === Infinity 
      ? 'MAX' 
      : `${userData.workXp}/${activeRank.requiredXp} XP`;

    // Visual do Embed
    const embed = new EmbedBuilder()
      .setTitle(`💼 Turno Finalizado — ${author.username}`)
      .setColor(leveledUp ? '#FEE75C' : '#57F287')
      .setThumbnail(author.displayAvatarURL({ dynamic: true }))
      .setDescription(
        leveledUp
          ? `🎉 **PARABÉNS! VOCÊ FOI PROMOVIDO!**\nSua dedicação rendeu frutos e agora seu cargo é **${nextRankTitle}**!`
          : `Você cumpriu mais um turno com excelência no seu cargo atual.`
      )
      .addFields(
        { name: '🏷️ Cargo Atual', value: `\`${activeRank.title}\` *(Nível ${activeRank.level}/7)*`, inline: true },
        { name: '💰 Salario Recebido', value: `\`+$${payGained.toLocaleString()}\``, inline: true },
        { name: '⚡ XP Ganho', value: `\`+${xpGained} XP\``, inline: true },
        { name: '📈 Progresso de Promoção', value: `\`${xpProgress}\``, inline: true },
        { name: '💵 Carteira Total', value: `\`$${userData.wallet.toLocaleString()}\``, inline: true }
      )
      .setFooter({ text: 'Seu descanso dura 20 minutos. Avisaremos no PV quando puder trabalhar!' })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });

    // Enviar aviso no PV exatamente após 20 minutos
    setTimeout(async () => {
      try {
        const checkUser = await UserModel.findOne({ userId: author.id });
        if (checkUser && !checkUser.workNotified) {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🔔 Turno Liberado!')
            .setColor('#57F287')
            .setDescription(`Olá **${author.username}**, o seu descanso de **20 minutos** terminou!\n\nVocê já pode trabalhar novamente no cargo de **${activeRank.title}** usando \`/work\` ou \`!work\`.`)
            .setTimestamp();

          await author.send({ embeds: [dmEmbed] });
          checkUser.workNotified = true;
          await checkUser.save();
        }
      } catch (e) {
        // Ignora caso a DM do usuário esteja fechada
      }
    }, cooldown);
  }
};
