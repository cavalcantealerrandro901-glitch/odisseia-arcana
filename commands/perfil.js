const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const mongoose = require('mongoose');

const userEconomySchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 }
});
const UserEconomy = mongoose.models.UserEconomy || mongoose.model('UserEconomy', userEconomySchema);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Exibe seu card de perfil estilizado.')
    .setNameLocalizations({ 'en-US': 'profile' })
    .setDescriptionLocalizations({ 'en-US': 'Displays your styled profile card.' })
    .addUserOption(option =>
      option.setName('membro')
        .setDescription('Membro para ver o perfil')
        .setNameLocalizations({ 'en-US': 'member' })
        .setRequired(false)
    ),
  name: 'perfil',
  aliases: ['profile', 'saldo'],
  category: 'Economia',
  description: 'Exibe o card de perfil do usuário.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    let targetUser;
    if (isSlash) {
      targetUser = ctx.options.getUser('membro') || author;
      await ctx.deferReply(); 
    } else {
      targetUser = ctx.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || author;
    }

    let userData = await UserEconomy.findOne({ userId: targetUser.id, guildId: guild.id });
    if (!userData) {
      userData = await UserEconomy.create({ userId: targetUser.id, guildId: guild.id, balance: 0 });
    }

    // --- INÍCIO DO CANVAS ---
    const canvas = createCanvas(800, 250);
    const context = canvas.getContext('2d');

    // 1. Carregar a IMAGEM DE FUNDO (O seu Card)
    // Se você tiver um link direto da imagem, coloque aqui embaixo no lugar dessa URL genérica:
    const backgroundURL = 'https://photos.app.goo.gl/PiEPgFSTDLGLkLhs7'; // Substitua pelo link do seu card!
    
    try {
      const background = await loadImage(backgroundURL);
      context.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      // Se der erro na imagem, fica preto
      context.fillStyle = '#18191c';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Camada escura transparente para destacar o texto
    context.fillStyle = 'rgba(0, 0, 0, 0.6)'; // 60% escuro
    context.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Desenhar o Avatar Redondo com borda
    context.save();
    context.beginPath();
    context.arc(125, 125, 75, 0, Math.PI * 2, true);
    context.lineWidth = 8;
    context.strokeStyle = '#9b59b6'; // Borda roxa
    context.stroke();
    context.closePath();
    context.clip();

    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarUrl);
    context.drawImage(avatar, 50, 50, 150, 150);
    context.restore();

    // 4. Textos do Card
    // Nome
    context.fillStyle = '#ffffff';
    context.font = 'bold 38px sans-serif';
    context.fillText(targetUser.username, 240, 95);

    // Separador
    context.fillStyle = '#9b59b6';
    context.fillRect(240, 115, 500, 3);

    // Informações: Carteira, Banco e Sequência
    context.fillStyle = '#f1c40f'; // Amarelo para dinheiro
    context.font = 'bold 24px sans-serif';
    context.fillText(`🪙 Carteira: ${userData.balance.toLocaleString()}`, 240, 160);
    
    context.fillStyle = '#3498db'; // Azul para banco
    context.fillText(`🏦 Banco: ${userData.bank.toLocaleString()}`, 520, 160);
    
    context.fillStyle = '#e74c3c'; // Vermelho para sequência
    context.fillText(`🔥 Fogo Diário: ${userData.dailyStreak || 0} dias`, 240, 205);

    // Criar o anexo e enviar
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'card_perfil.png' });

    if (isSlash) {
      return ctx.editReply({ files: [attachment] });
    } else {
      return ctx.reply({ files: [attachment] });
    }
  }
};
