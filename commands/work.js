const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const mongoose = require('mongoose');

// Schema atualizado com XP
const userEconomySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  lastWork: { type: Number, default: 0 },
  xp: { type: Number, default: 0 }
});
const UserEconomy = mongoose.models.UserEconomy || mongoose.model('UserEconomy', userEconomySchema);

// Lista com os 7 cargos
const jobs = [
  { name: 'Aprendiz', minXp: 0 },
  { name: 'Aventureiro', minXp: 150 },
  { name: 'Caçador', minXp: 400 },
  { name: 'Mercenário', minXp: 800 },
  { name: 'Cavaleiro', minXp: 1400 },
  { name: 'Guardião', minXp: 2200 },
  { name: 'Mestre Arcano', minXp: 3200 }
];

function getJobInfo(xp) {
  let currentJob = jobs[0];
  let nextJob = jobs[1];
  for (let i = jobs.length - 1; i >= 0; i--) {
    if (xp >= jobs[i].minXp) {
      currentJob = jobs[i];
      nextJob = jobs[i + 1] || null;
      break;
    }
  }
  return { currentJob, nextJob };
}

// Primeiras mensagens (Ação realizada)
const workExpressions = [
  "Você caçou monstros na floresta sombria",
  "Você ajudou o ferreiro a forjar espadas",
  "Você vendeu poções mágicas no mercado",
  "Você escoltou uma caravana com sucesso",
  "Você limpou o porão da guilda dos goblins",
  "Você encontrou um baú perdido nas ruínas",
  "Você trabalhou como guarda na capital"
];

// Segundas mensagens (Mensagem extra logo embaixo)
const subExpressions = [
  "O mestre da guilda ficou impressionado com seu esforço!",
  "Você aprendeu novos truques e aprimorou suas habilidades.",
  "Seu cliente ficou muito satisfeito com o serviço prestado.",
  "Sua reputação está se espalhando por toda a região!",
  "Você concluiu a tarefa com maestria e sem cometer erros."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabalhe para ganhar almas e subir de cargo.')
    .setNameLocalizations({ 'en-US': 'work' })
    .setDescriptionLocalizations({ 'en-US': 'Work to earn souls and job XP.' }),
  name: 'work',
  aliases: ['trabalhar', 'w'],
  category: 'Economia',
  description: 'Trabalhe para ganhar almas e XP.',
  async execute(ctx, client, isSlash) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    if (isSlash) await ctx.deferReply();

    let userData = await UserEconomy.findOne({ userId: author.id, guildId: guild.id });
    if (!userData) {
      userData = await UserEconomy.create({ userId: author.id, guildId: guild.id, balance: 0, lastWork: 0, xp: 0 });
    }

    const cooldownTime = 2 * 60 * 60 * 1000; // 2 horas
    const timeSinceLastWork = Date.now() - (userData.lastWork || 0);

    if (timeSinceLastWork < cooldownTime) {
      const timeLeft = cooldownTime - timeSinceLastWork;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      const msgCooldown = `⏳ Você está cansado! Descanse por mais **${hours}h e ${minutes}m** antes de trabalhar novamente.`;
      return isSlash ? ctx.editReply(msgCooldown) : ctx.reply(msgCooldown);
    }

    // Ganhos aleatórios
    const earnings = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
    const xpGained = Math.floor(Math.random() * (35 - 15 + 1)) + 15;

    const randomExpression = workExpressions[Math.floor(Math.random() * workExpressions.length)];
    const randomSubExpression = subExpressions[Math.floor(Math.random() * subExpressions.length)];

    userData.balance += earnings;
    userData.xp = (userData.xp || 0) + xpGained;
    userData.lastWork = Date.now();
    await userData.save();

    const { currentJob, nextJob } = getJobInfo(userData.xp);

    // --- INÍCIO DO CANVAS ---
    const canvas = createCanvas(750, 240);
    const context = canvas.getContext('2d');

    // Fundo Escuro
    context.fillStyle = '#18191c';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Barra lateral de sucesso (Verde)
    context.fillStyle = '#2ecc71';
    context.fillRect(0, 0, 15, canvas.height);

    // Avatar Redondo
    context.save();
    context.beginPath();
    context.arc(105, 120, 60, 0, Math.PI * 2, true);
    context.closePath();
    context.clip();

    const avatarUrl = author.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarUrl);
    context.drawImage(avatar, 45, 60, 120, 120);
    context.restore();

    // Borda do Avatar
    context.beginPath();
    context.arc(105, 120, 60, 0, Math.PI * 2, true);
    context.lineWidth = 5;
    context.strokeStyle = '#2ecc71';
    context.stroke();

    // Título Principal
    context.fillStyle = '#ffffff';
    context.font = 'bold 28px sans-serif';
    context.fillText('Trabalho Concluído!', 190, 55);

    // Cargo Atual no Canto Superior Direito
    context.fillStyle = '#9b59b6';
    context.font = 'bold 18px sans-serif';
    context.textAlign = 'right';
    context.fillText(`🏅 ${currentJob.name}`, 720, 55);

    // 1ª Mensagem (Ação principal)
    context.textAlign = 'left';
    context.fillStyle = '#a1a3a6';
    context.font = '19px sans-serif';
    context.fillText(`${randomExpression}`, 190, 92, 520);

    // 2ª Mensagem (Nova mensagem extra solicitada)
    context.fillStyle = '#3498db';
    context.font = 'italic 17px sans-serif';
    context.fillText(`💬 "${randomSubExpression}"`, 190, 122, 520);

    // Valor Ganho + XP
    context.fillStyle = '#2ecc71';
    context.font = 'bold 30px sans-serif';
    context.fillText(`+ ${earnings.toLocaleString()} Almas`, 190, 168);

    context.fillStyle = '#e67e22';
    context.font = 'bold 20px sans-serif';
    context.fillText(`(+${xpGained} XP)`, 450, 168);

    // Rodapé: Progresso de XP e Saldo
    context.fillStyle = '#f1c40f';
    context.font = '16px sans-serif';
    context.textAlign = 'left';
    const xpText = nextJob ? `XP: ${userData.xp}/${nextJob.minXp}` : `XP: ${userData.xp} (Nível Máximo)`;
    context.fillText(`⚡ ${xpText}`, 190, 210);

    context.textAlign = 'right';
    context.fillText(`🪙 Saldo: ${userData.balance.toLocaleString()} Almas`, 720, 210);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'card_work.png' });

    if (isSlash) {
      return ctx.editReply({ files: [attachment] });
    } else {
      return ctx.reply({ files: [attachment] });
    }
  }
};
