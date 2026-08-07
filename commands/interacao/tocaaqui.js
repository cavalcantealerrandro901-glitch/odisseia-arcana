const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

module.exports = {
  name: 'tocaaqui',
  aliases: ['highfive', 'toque'],
  description: 'Dê um toque de mãos (high-five) com um membro',
  slashData: new SlashCommandBuilder()
    .setName('tocaaqui')
    .setDescription('Dê um toque de mãos (high-five) com um membro')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Membro para tocar a mão')
        .setRequired(true)
    ),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Você precisa mencionar com quem quer tocar as mãos! Ex: \`${prefix}tocaaqui @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode dar high-five sozinho!');

    return executarInteracao(message, message.author, target, 'highfive', 'deu um toque de mãos com', '✋', '#1ABC9C', false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode dar high-five sozinho!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao(interaction, interaction.user, target, 'highfive', 'deu um toque de mãos com', '✋', '#1ABC9C', true);
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
    .setDescription(`${emoji} **${currentAuthor.username}** ${nomeAcao} **${currentTarget.username}**!`)
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
    time: 360000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== currentTarget.id) {
      return i.reply({ content: '❌ Apenas quem foi convidado pode devolver o toque de mãos!', flags: [MessageFlags.Ephemeral] });
    }

    const temp = currentAuthor;
    currentAuthor = currentTarget;
    currentTarget = temp;

    const novoGif = await getGif(endpoint);

    const novoEmbed = new EmbedBuilder()
      .setDescription(`${emoji} **${currentAuthor.username}** devolveu o toque de mãos para **${currentTarget.username}**!`)
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
