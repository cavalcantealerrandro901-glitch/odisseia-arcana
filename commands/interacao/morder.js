const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

module.exports = {
  name: 'morder',
  aliases: ['bite', 'mordida'],
  description: 'Dê uma mordida em um membro',
  slashData: new SlashCommandBuilder()
    .setName('morder')
    .setDescription('Dê uma mordida em um membro')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Membro em quem você quer dar uma mordida')
        .setRequired(true)
    ),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Você precisa mencionar quem quer morder! Ex: \`${prefix}morder @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode morder a si mesmo!');

    return executarInteracao(message, message.author, target, 'bite', 'uma mordida em', '🦷', '#E67E22', false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode morder a si mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao(interaction, interaction.user, target, 'bite', 'uma mordida em', '🦷', '#E67E22', true);
  }
};

async function getGif(endpoint) {
  try {
    const res = await fetch(`https://nekos.best/api/v2/${endpoint}`, {
      headers: { 'User-Agent': 'DiscordBot/1.0' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const url = data.results?.[0]?.url;
    return (url && url.startsWith('http')) ? url : null;
  } catch (err) {
    console.error('Erro na API de GIF:', err.message);
    return null;
  }
}

async function executarInteracao(contexto, autor, alvo, endpoint, nomeAcao, emoji, cor, isSlash) {
  if (isSlash) await contexto.deferReply();

  let currentAuthor = autor;
  let currentTarget = alvo;

  let gif = await getGif(endpoint);

  const button = new ButtonBuilder()
    .setCustomId('devolver_acao')
    .setLabel('Devolver 🔄')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  const embed = new EmbedBuilder()
    .setDescription(`${emoji} **${currentAuthor.username}** deu ${nomeAcao} **${currentTarget.username}**!`)
    .setColor(cor)
    .setTimestamp();

  if (gif) embed.setImage(gif);

  const payload = {
    content: `<@${currentAuthor.id}> <@${currentTarget.id}>`,
    embeds: [embed],
    components: [row]
  };

  const mensagem = isSlash ? await contexto.editReply(payload) : await contexto.reply(payload);

  const collector = mensagem.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 360000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== currentTarget.id) {
      return i.reply({ content: '❌ Apenas quem recebeu a ação pode devolver!', flags: [MessageFlags.Ephemeral] });
    }

    const temp = currentAuthor;
    currentAuthor = currentTarget;
    currentTarget = temp;

    const novoGif = await getGif(endpoint);

    const novoEmbed = new EmbedBuilder()
      .setDescription(`${emoji} **${currentAuthor.username}** devolveu a mordida para **${currentTarget.username}**!`)
      .setColor(cor)
      .setTimestamp();

    if (novoGif) novoEmbed.setImage(novoGif);

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
