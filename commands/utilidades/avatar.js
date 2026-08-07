const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

module.exports = {
  name: 'avatar',
  aliases: ['av', 'pfp', 'icone', 'icon', 'useravatar'],
  description: 'Exibe o avatar/foto de perfil de um usuário em alta resolução',
  slashData: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Exibe a foto de perfil de um usuário')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Selecione o usuário para ver o avatar')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    let targetUser = message.mentions.users.first();

    if (!targetUser && args[0]) {
      try {
        targetUser = await client.users.fetch(args[0]);
      } catch (err) {
        targetUser = null;
      }
    }

    if (!targetUser) targetUser = message.author;

    return exibirAvatar(message, targetUser, false);
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    return exibirAvatar(interaction, targetUser, true);
  }
};

async function exibirAvatar(contexto, targetUser, isSlash = false) {
  const avatarUrl = targetUser.displayAvatarURL({ size: 4096 });
  const autor = isSlash ? contexto.user : contexto.author;

  const embed = new EmbedBuilder()
    .setTitle(`🖼️ Avatar de ${targetUser.globalName || targetUser.username}`)
    .setDescription(`Clique no botão abaixo para baixar a imagem em alta qualidade.`)
    .setImage(avatarUrl)
    .setColor('#5865F2')
    .setFooter({ 
      text: `Solicitado por ${autor.tag}`, 
      iconURL: autor.displayAvatarURL() 
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Abrir/Baixar Imagem (HD)')
      .setURL(avatarUrl)
      .setStyle(ButtonStyle.Link)
  );

  if (isSlash) {
    return contexto.reply({ embeds: [embed], components: [row] });
  } else {
    return contexto.reply({ embeds: [embed], components: [row] });
  }
}
