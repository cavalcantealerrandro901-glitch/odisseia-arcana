const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

module.exports = {
  name: 'beijo',
  aliases: ['kiss', 'beijar'],
  description: 'Dê um beijo carinhoso em um membro',
  slashData: new SlashCommandBuilder()
    .setName('beijo')
    .setDescription('Dê um beijo carinhoso em um membro')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Membro que você deseja beijar')
        .setRequired(true)
    ),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Você precisa mencionar quem deseja beijar! Ex: \`${prefix}beijo @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode beijar a si mesmo!');

    return executarInteracao(message, message.author, target, 'kiss', 'beijo', '💋', '#FFB6C1', false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode beijar a si mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao(interaction, interaction.user, target, 'kiss', 'beijo', '💋', '#FFB6C1', true);
  }
};

async function getGif(endpoint) {
  try {
    const res = await fetch(`https://nekos.best/api/v2/${endpoint}`);
    const data = await res.json();
    return data.results[0]?.url || '';
  } catch {
    return '';
  }
}

async function executarInteracao(contexto, autor, alvo, endpoint, nomeAcao, emoji, cor, isSlash) {
  let currentAuthor = autor;
  let currentTarget = alvo;

  let gif = await getGif(endpoint);

  const button = new ButtonBuilder()
    .setCustomId('devolver_acao')
    .setLabel('Devolver 🔄')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  const embed = new EmbedBuilder()
    .setDescription(`${emoji} **${currentAuthor.username}** deu um ${nomeAcao} em **${currentTarget.username}**!`)
    .setColor(cor)
    .setImage(gif)
    .setTimestamp();

  const payload = {
    content: `<@${currentAuthor.id}> <@${currentTarget.id}>`,
    embeds: [embed],
    components: [row],
    fetchReply: true
  };

  const mensagem = isSlash ? await contexto.reply(payload) : await contexto.reply(payload);

  const collector = mensagem.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 360000 // 6 minutos
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== currentTarget.id) {
      return i.reply({ content: '❌ Apenas quem recebeu a ação pode devolver!', flags: [MessageFlags.Ephemeral] });
    }

    // Inverte o remetente e o destinatário
    const temp = currentAuthor;
    currentAuthor = currentTarget;
    currentTarget = temp;

    const novoGif = await getGif(endpoint);

    const novoEmbed = new EmbedBuilder()
      .setDescription(`${emoji} **${currentAuthor.username}** devolveu o ${nomeAcao} para **${currentTarget.username}**!`)
      .setColor(cor)
      .setImage(novoGif)
      .setTimestamp();

    await i.update({
      content: `<@${currentAuthor.id}> <@${currentTarget.id}>`,
      embeds: [novoEmbed],
      components: [row]
    });
  });

  collector.on('end', () => {
    button.setDisabled(true);
    const disabledRow = new ActionRowBuilder().addComponents(button);
    mensagem.edit({ components: [disabledRow] }).catch(() => {});
  });
}
