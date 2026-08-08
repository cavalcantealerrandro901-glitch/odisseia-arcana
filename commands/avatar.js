const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'avatar',
  aliases: ['av', 'foto', 'pfp'],
  category: 'Utilidade',
  description: 'Exibe a foto de perfil (avatar) sua ou de outro usuário.',

  async execute(ctx, client, isSlash, args) {
    // Garantir que roda apenas por mensagem de texto (prefixo)
    const message = ctx;
    const author = message.author;

    // 1. Identificar o usuário alvo (Menção, ID ou o próprio autor)
    let targetUser = message.mentions?.users?.first();

    if (!targetUser && args && args[0]) {
      try {
        targetUser = await client.users.fetch(args[0]);
      } catch (e) {
        targetUser = null;
      }
    }

    if (!targetUser) {
      targetUser = author;
    }

    // 2. Gerar URLs do avatar em alta qualidade (1024px)
    const dynamicAvatar = targetUser.displayAvatarURL({ size: 1024 });
    const avatarPng = targetUser.displayAvatarURL({ extension: 'png', size: 1024 });
    const avatarJpg = targetUser.displayAvatarURL({ extension: 'jpg', size: 1024 });
    const avatarWebp = targetUser.displayAvatarURL({ extension: 'webp', size: 1024 });
    const avatarGif = targetUser.displayAvatarURL({ extension: 'gif', size: 1024 });

    // 3. Criar a Embed
    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Foto de Perfil de ${targetUser.username}`)
      .setDescription(`[Clique aqui para abrir a imagem no navegador](${dynamicAvatar})`)
      .setImage(dynamicAvatar)
      .setColor('#3498db')
      .setFooter({ text: `Solicitado por ${author.username}`, iconURL: author.displayAvatarURL() })
      .setTimestamp();

    // 4. Criar botões com links diretos para download
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('PNG')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarPng),
      new ButtonBuilder()
        .setLabel('JPG')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarJpg),
      new ButtonBuilder()
        .setLabel('WEBP')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarWebp)
    );

    // Se o avatar for animado (GIF), adiciona o botão de GIF
    if (targetUser.avatar && targetUser.avatar.startsWith('a_')) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('GIF')
          .setStyle(ButtonStyle.Link)
          .setURL(avatarGif)
      );
    }

    // Responder à mensagem
    return message.reply({ embeds: [embed], components: [row] });
  }
};
