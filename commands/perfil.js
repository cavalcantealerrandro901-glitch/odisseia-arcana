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
    .setDescription('Exibe seu card de perfil e estatísticas de economia.')
    .setNameLocalizations({
      'en-US': 'profile',
      'en-GB': 'profile'
    })
    .setDescriptionLocalizations({
      'en-US': 'Displays your profile card and economy stats.',
      'en-GB': 'Displays your profile card and economy stats.'
    })
    .addUserOption(option =>
      option.setName('membro')
        .setDescription('Membro para ver o perfil (opcional)')
        .setNameLocalizations({ 'en-US': 'member', 'en-GB': 'member' })
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
      await ctx.deferReply(); // O canvas leva um tempinho para desenhar
    } else {
      targetUser = ctx.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || author;
    }

    let userData = await UserEconomy.findOne({ userId: targetUser.id, guildId: guild.id });
    if (!userData) {
      userData = await UserEconomy.create({ userId: targetUser.id, guildId: guild.id, balance: 0 });
    }

    // --- INÍCIO DO CANVAS (Criação do Card) ---
    const canvas = createCanvas(800, 250);
    const context = canvas.getContext('2d');

    // Fundo escuro do card
    context.fillStyle = '#18191c';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Detalhe de cor lateral (Roxo Aeternos)
    context.fillStyle = '#9b59b6';
    context.fillRect(0, 0, 15, canvas.height);

    // Desenhar o Avatar Redondo
    context.save();
    context.beginPath();
    context.arc(125, 125, 75, 0, Math.PI * 2, true);
    context.closePath();
    context.clip();

    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarUrl);
    context.drawImage(avatar, 50, 50, 150, 150);
    context.restore();

    // Borda ao redor do avatar
    context.beginPath();
    context.arc(125, 125, 75, 0, Math.PI * 2, true);
    context.lineWidth = 6;
    context.strokeStyle = '#9b59b6';
    context.stroke();

    // Nome do Usuário
    context.fillStyle = '#ffffff';
    context.font = 'bold 38px sans-serif';
    context.fillText(targetUser.username, 230, 95);

    // Subtítulo
    context.fillStyle = '#a1a3a6';
    context.font = '22px sans-serif';
    context.fillText('Informações de Economia', 230, 130);

    // Informações: Carteira, Banco e Sequência
    context.fillStyle = '#ffffff';
    context.font = 'bold 24px sans-serif';
    
    // Alinhamento para simular colunas
    context.fillText(`🪙 Carteira: ${userData.balance.toLocaleString()}`, 230, 185);
    context.fillText(`🏦 Banco: ${userData.bank.toLocaleString()}`, 520, 185);
    context.fillText(`🔥 Fogo Diário: ${userData.dailyStreak || 0} dias`, 230, 225);

    // Criar o anexo (imagem final)
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'card_perfil.png' });

    // Enviar a resposta
    if (isSlash) {
      return ctx.editReply({ files: [attachment] });
    } else {
      return ctx.reply({ files: [attachment] });
    }
  }
};
