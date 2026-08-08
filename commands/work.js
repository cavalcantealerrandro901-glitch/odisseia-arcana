const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const mongoose = require('mongoose');

// Atualizando o Schema para incluir o tempo do último trabalho (lastWork)
const userEconomySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  lastWork: { type: Number, default: 0 }
});
const UserEconomy = mongoose.models.UserEconomy || mongoose.model('UserEconomy', userEconomySchema);

// Frases aleatórias de trabalho
const workExpressions = [
  "Você caçou monstros na floresta sombria",
  "Você ajudou o ferreiro a forjar espadas",
  "Você vendeu poções mágicas no mercado",
  "Você escoltou uma caravana com sucesso",
  "Você limpou o porão da guilda dos goblins",
  "Você encontrou um baú perdido nas ruínas",
  "Você trabalhou como guarda na capital"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabalhe para ganhar almas na sua carteira.')
    .setNameLocalizations({
      'en-US': 'work',
      'en-GB': 'work'
    })
    .setDescriptionLocalizations({
      'en-US': 'Work to earn souls for your wallet.',
      'en-GB': 'Work to earn souls for your wallet.'
    }),
  name: 'work',
  aliases: ['trabalhar', 'w'],
  category: 'Economia',
  description: 'Trabalhe para ganhar almas.',
  async execute(ctx, client, isSlash) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    if (isSlash) await ctx.deferReply();

    // 1. Buscar ou criar perfil no banco de dados
    let userData = await UserEconomy.findOne({ userId: author.id, guildId: guild.id });
    if (!userData) {
      userData = await UserEconomy.create({ userId: author.id, guildId: guild.id, balance: 0, lastWork: 0 });
    }

    // 2. Sistema de Cooldown (Tempo de espera de 2 horas = 7200000 ms)
    const cooldownTime = 2 * 60 * 60 * 1000;
    const timeSinceLastWork = Date.now() - (userData.lastWork || 0);

    if (timeSinceLastWork < cooldownTime) {
      const timeLeft = cooldownTime - timeSinceLastWork;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      const msgCooldown = `⏳ Você está cansado! Descanse por mais **${hours}h e ${minutes}m** antes de trabalhar novamente.`;
      return isSlash ? ctx.editReply(msgCooldown) : ctx.reply(msgCooldown);
    }

    // 3. Calcular ganhos aleatórios e escolher frase
    const earnings = Math.floor(Math.random() * (500 - 100 + 1)) + 100; // Entre 100 e 500 almas
    const randomExpression = workExpressions[Math.floor(Math.random() * workExpressions.length)];

    // 4. Salvar novos dados
    userData.balance += earnings;
    userData.lastWork = Date.now();
    await userData.save();

    // --- INÍCIO DO CANVAS (Card de Trabalho) ---
    const canvas = createCanvas(700, 200);
    const context = canvas.getContext('2d');

    // Fundo Escuro
    context.fillStyle = '#18191c';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Barra lateral de sucesso (Verde)
    context.fillStyle = '#2ecc71';
    context.fillRect(0, 0, 15, canvas.height);

    // Desenhar o Avatar
    context.save();
    context.beginPath();
    context.arc(100, 100, 60, 0, Math.PI * 2, true);
    context.closePath();
    context.clip();

    const avatarUrl = author.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarUrl);
    context.drawImage(avatar, 40, 40, 120, 120);
    context.restore();

    // Borda do Avatar
    context.beginPath();
    context.arc(100, 100, 60, 0, Math.PI * 2, true);
    context.lineWidth = 5;
    context.strokeStyle = '#2ecc71';
    context.stroke();

    // Título Principal
    context.fillStyle = '#ffffff';
    context.font = 'bold 32px sans-serif';
    context.fillText('Trabalho Concluído!', 190, 70);

    // A Frase de Expressão
    context.fillStyle = '#a1a3a6';
    context.font = '20px sans-serif';
    context.fillText(`${randomExpression} e ganhou:`, 190, 110);

    // O Valor Ganho
    context.fillStyle = '#2ecc71';
    context.font = 'bold 38px sans-serif';
    context.fillText(`+ ${earnings.toLocaleString()} Almas`, 190, 160);

    // Saldo Total (canto inferior direito)
    context.fillStyle = '#f1c40f';
    context.font = '18px sans-serif';
    context.textAlign = 'right';
    context.fillText(`Saldo Atual: ${userData.balance.toLocaleString()}`, 670, 180);

    // --- FIM DO CANVAS ---

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'card_work.png' });
    const textMessage = `✨ **${author.username}**, ${randomExpression.toLowerCase()}!`;

    if (isSlash) {
      return ctx.editReply({ content: textMessage, files: [attachment] });
    } else {
      return ctx.reply({ content: textMessage, files: [attachment] });
    }
  }
};
