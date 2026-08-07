const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const mongoose = require('mongoose');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ver')
    .setDescription('Comandos de visualização.')
    .addSubcommand(sub =>
      sub
        .setName('perfil')
        .setDescription('Mostra o card de perfil de um usuário.')
        .addUserOption(opt => 
          opt.setName('usuario')
            .setDescription('Usuário que você deseja ver o perfil')
            .setRequired(false))
    ),
  name: 'perfil',
  category: 'Perfil',
  aliases: ['profile'],
  description: 'Exibe o seu card de perfil ou de outro usuário.',
  async execute(ctx, client, isSlash, args = []) {
    let targetUser = ctx.author || ctx.user;
    
    if (isSlash) {
      const u = ctx.options.getUser('usuario');
      if (u) targetUser = u;
    } else {
      if (ctx.mentions && ctx.mentions.users.size > 0) {
        targetUser = ctx.mentions.users.first();
      } else if (args.length > 0) {
        const fetchUser = client.users.cache.get(args[0].replace(/[<@!>]/g, ''));
        if (fetchUser) targetUser = fetchUser;
      }
    }

    if (targetUser.bot) {
      return ctx.reply('❌ Bots não possuem perfil!');
    }

    const loadingMsg = await ctx.reply('🎨 `Pintando o card de perfil... Aguarde!`');

    const UserModel = mongoose.models.User || mongoose.model('User');
    let userData = await UserModel.findOne({ userId: targetUser.id });
    if (!userData) {
      userData = { souls: 0, level: 1, xp: 0, sobre: 'Um viajante misterioso de Odisseia Arcana.', casamentos: 'Ninguém' };
    }

    try {
      // 1. Carregar o Template
      const background = await loadImage(path.join(__dirname, '..', 'assets', 'template_perfil.png'));
      const canvas = createCanvas(background.width, background.height);
      const ctxCanvas = canvas.getContext('2d');
      ctxCanvas.drawImage(background, 0, 0, canvas.width, canvas.height);

      // 2. Avatar
      const avatarX = 233;
      const avatarY = 250;
      const avatarRadius = 135;

      const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 512 });
      const avatar = await loadImage(avatarURL);

      ctxCanvas.save();
      ctxCanvas.beginPath();
      ctxCanvas.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
      ctxCanvas.closePath();
      ctxCanvas.clip();
      ctxCanvas.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      ctxCanvas.restore();

      // 3. Estilos e Textos
      ctxCanvas.fillStyle = '#ffffff';
      ctxCanvas.shadowColor = '#000000';
      ctxCanvas.shadowBlur = 4;
      ctxCanvas.shadowOffsetX = 2;
      ctxCanvas.shadowOffsetY = 2;

      // NOME
      ctxCanvas.font = 'bold 32px sans-serif';
      ctxCanvas.fillText(targetUser.username.substring(0, 15), 440, 240);

      // CASAMENTO
      ctxCanvas.font = 'italic 28px sans-serif';
      ctxCanvas.fillStyle = '#d8b4fe';
      const parceiro = userData.casamento || 'Solteiro(a)';
      ctxCanvas.fillText(parceiro, 440, 325);

      // SALDO DE ALMAS
      ctxCanvas.font = 'bold 36px sans-serif';
      ctxCanvas.fillStyle = '#f1c40f';
      ctxCanvas.fillText((userData.souls || 0).toLocaleString(), 760, 310);

      // NÍVEL
      ctxCanvas.font = 'bold 45px sans-serif';
      ctxCanvas.fillStyle = '#ffffff';
      ctxCanvas.textAlign = 'center';
      ctxCanvas.fillText(userData.level || 1, 235, 845);
      ctxCanvas.textAlign = 'left';

      // SOBRE MIM
      ctxCanvas.font = '24px sans-serif';
      ctxCanvas.fillStyle = '#e0e0e0';
      const sobre = userData.sobre || 'Um guerreiro destemido forjando\nsua lenda na Odisseia Arcana.';
      const linhasSobre = sobre.match(/.{1,35}(\s|$)/g) || [sobre];
      linhasSobre.forEach((linha, i) => {
         ctxCanvas.fillText(linha.trim(), 690, 520 + (i * 35));
      });

      // CONQUISTAS
      ctxCanvas.font = '24px sans-serif';
      ctxCanvas.fillText('🏆 Iniciante', 80, 520);
      ctxCanvas.fillText('⚔️ Primeira Batalha', 80, 560);

      // 4. BARRA DE XP
      const currentXP = userData.xp || 0;
      const requiredXP = (userData.level || 1) * 1000;
      let xpPercent = currentXP / requiredXP;
      if (xpPercent > 1) xpPercent = 1;

      const xpBarX = 405;
      const xpBarY = 813;
      const maxBarWidth = 470;
      const barHeight = 22;
      const currentBarWidth = maxBarWidth * xpPercent;

      ctxCanvas.fillStyle = '#9b59b6';
      ctxCanvas.shadowColor = 'transparent';
      ctxCanvas.fillRect(xpBarX, xpBarY, currentBarWidth, barHeight);

      ctxCanvas.font = 'bold 20px sans-serif';
      ctxCanvas.fillStyle = '#ffffff';
      ctxCanvas.shadowColor = '#000000';
      ctxCanvas.fillText(`${currentXP} / ${requiredXP} XP`, xpBarX + 160, xpBarY + 18);

      // 5. PROCESSAR IMAGEM E ENVIAR
      const buffer = await canvas.encode('png');
      const attachment = new AttachmentBuilder(buffer, { name: 'perfil.png' });

      if (isSlash) {
        await ctx.editReply({ content: `🔮 Perfil de **${targetUser.username}**`, files: [attachment] });
      } else {
        await loadingMsg.edit({ content: `🔮 Perfil de **${targetUser.username}**`, files: [attachment] });
      }

    } catch (error) {
      console.error(error);
      const errMsg = '❌ Erro ao gerar o card de perfil. Verifique se a imagem `template_perfil.png` está na pasta `assets`.';
      if (isSlash) await ctx.editReply(errMsg);
      else await loadingMsg.edit(errMsg);
    }
  }
};
