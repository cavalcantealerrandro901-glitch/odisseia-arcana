const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

module.exports = {
  name: 'morder',
  aliases: ['bite', 'nhac'],
  description: 'Dê uma mordidinha em um membro',
  slashData: new SlashCommandBuilder()
    .setName('morder')
    .setDescription('Dê uma mordidinha em um membro')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Membro que vai receber a mordida')
        .setRequired(true)
    ),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Você precisa mencionar quem quer morder! Ex: \`${prefix}morder @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode morder a si mesmo!');

    return executarInteracao(message, message.author, target, 'bite', 'deu uma mordidinha em', '🦷', '#E67E22', false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode morder a si mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao(interaction, interaction.user, target, 'bite', 'deu uma mordidinha em', '🦷', '#E67E22', true);
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
      return i.reply({ content: '❌ Apenas quem levou a mordida pode devolver!', flags: [MessageFlags.Ephemeral] });
    }

    const temp = currentAuthor;
    currentAuthor = currentTarget;
    currentTarget = temp;

    const novoGif = await getGif(endpoint);

    const novoEmbed = new EmbedBuilder()
      .setDescription(`${emoji} **${currentAuthor.username}** devolveu a mordidinha em **${currentTarget.username}**!`)
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
