const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Exibe a foto de perfil (avatar) sua ou de outro usuário.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Selecione o usuário para ver o avatar')
        .setRequired(false)
    ),

  name: 'avatar',
  aliases: ['av', 'foto', 'pfp'],
  category: 'Utilidade',
  description: 'Exibe a foto de perfil (avatar) sua ou de outro usuário.',

  async execute(ctx, client, isSlash, args) {
    let author, targetUser;

    if (isSlash) {
      await ctx.deferReply();
      author = ctx.user;
      targetUser = ctx.options.getUser('usuario') || author;
    } else {
      author = ctx.author || ctx.user;
      targetUser = ctx.mentions?.users?.first();

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
    }

    // URLs do avatar em alta qualidade
    const dynamicAvatar = targetUser.displayAvatarURL({ size: 1024 });
    const avatarPng = targetUser.displayAvatarURL({ extension: 'png', size: 1024 });
    const avatarJpg = targetUser.displayAvatarURL({ extension: 'jpg', size: 1024 });
    const avatarWebp = targetUser.displayAvatarURL({ extension: 'webp', size: 1024 });
    const avatarGif = targetUser.displayAvatarURL({ extension: 'gif', size: 1024 });

    // Embed
    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Foto de Perfil de ${targetUser.username}`)
      .setDescription(`[Clique aqui para abrir a imagem no navegador](${dynamicAvatar})`)
      .setImage(dynamicAvatar)
      .setColor('#3498db')
      .setFooter({ text: `Solicitado por ${author.username}`, iconURL: author.displayAvatarURL() })
      .setTimestamp();

    // Botões de download
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

    if (targetUser.avatar && targetUser.avatar.startsWith('a_')) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('GIF')
          .setStyle(ButtonStyle.Link)
          .setURL(avatarGif)
      );
    }

    if (isSlash) {
      return ctx.editReply({ embeds: [embed], components: [row] });
    } else {
      return ctx.reply({ embeds: [embed], components: [row] });
    }
  }
};
