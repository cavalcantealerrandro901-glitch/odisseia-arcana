const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const mongoose = require('mongoose');

// Schema de Economia
const userEconomySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  lastWork: { type: Number, default: 0 },
  xp: { type: Number, default: 0 }
});
const UserEconomy = mongoose.models.UserEconomy || mongoose.model('UserEconomy', userEconomySchema);

// Cargos de Trabalho
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
  for (let i = jobs.length - 1; i >= 0; i--) {
    if (xp >= jobs[i].minXp) {
      currentJob = jobs[i];
      break;
    }
  }
  return currentJob;
}

module.exports = {
  // Configuração do Slash Command (/almas)
  data: new SlashCommandBuilder()
    .setName('almas')
    .setDescription('Veja o seu saldo de almas ou o de outro usuário.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Selecione o usuário para ver o saldo de almas')
        .setRequired(false)
    ),
  
  // Configuração para Prefixo (!atm, !bal, !saldo)
  name: 'atm',
  aliases: ['bal', 'saldo', 'carteira', 'almas'],
  category: 'Economia',
  description: 'Mostra o saldo de almas na carteira e no banco.',

  async execute(ctx, client, isSlash) {
    const guild = ctx.guild;

    if (isSlash) await ctx.deferReply();

    // Identifica o usuário alvo (seja mencionado ou quem usou o comando)
    let targetUser;
    if (isSlash) {
      targetUser = ctx.options.getUser('usuario') || ctx.user;
    } else {
      targetUser = ctx.mentions?.users?.first() || ctx.author || ctx.user;
    }

    // Busca os dados de economia no banco de dados
    let userData = await UserEconomy.findOne({ userId: targetUser.id, guildId: guild.id });
    if (!userData) {
      userData = { balance: 0, bank: 0, xp: 0 };
    }

    const currentJob = getJobInfo(userData.xp || 0);
    const carteira = userData.balance || 0;
    const banco = userData.bank || 0;
    const total = carteira + banco;

    // --- INÍCIO DO CANVAS ---
    const canvas = createCanvas(750, 240);
    const context = canvas.getContext('2d');

    // Fundo Escuro
    context.fillStyle = '#18191c';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Barra lateral Dourada (Economia)
    context.fillStyle = '#f1c40f';
    context.fillRect(0, 0, 15, canvas.height);

    // Avatar Redondo do Usuário
    context.save();
    context.beginPath();
    context.arc(105, 120, 60, 0, Math.PI * 2, true);
    context.closePath();
    context.clip();

    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarUrl);
    context.drawImage(avatar, 45, 60, 120, 120);
    context.restore();

    // Borda Dourada do Avatar
    context.beginPath();
    context.arc(105, 120, 60, 0, Math.PI * 2, true);
    context.lineWidth = 5;
    context.strokeStyle = '#f1c40f';
    context.stroke();

    // Nome do Usuário
    context.fillStyle = '#ffffff';
    context.font = 'bold 26px sans-serif';
    context.fillText(`Saldo de ${targetUser.username}`, 190, 50, 360);

    // Badge do Cargo
    context.fillStyle = '#9b59b6';
    context.font = 'bold 18px sans-serif';
    context.textAlign = 'right';
    context.fillText(`🏅 ${currentJob.name}`, 720, 50);

    // Carteira
    context.textAlign = 'left';
    context.fillStyle = '#2ecc71';
    context.font = 'bold 22px sans-serif';
    context.fillText(`👛 Carteira: ${carteira.toLocaleString()} Almas`, 190, 100);

    // Banco
    context.fillStyle = '#3498db';
    context.font = 'bold 22px sans-serif';
    context.fillText(`🏦 Banco: ${banco.toLocaleString()} Almas`, 190, 145);

    // Total de Almas
    context.fillStyle = '#f1c40f';
    context.font = 'bold 24px sans-serif';
    context.fillText(`🪙 Total: ${total.toLocaleString()} Almas`, 190, 195);

    // Anexo da imagem
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'card_saldo.png' });

    // Enviar a resposta
    if (isSlash) {
      return ctx.editReply({ files: [attachment] });
    } else {
      return ctx.reply({ files: [attachment] });
    }
  }
};
