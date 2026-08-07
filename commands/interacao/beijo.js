const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

const GIFS_BEIJO = [
  'https://media.giphy.com/media/G3va39rn8E4A8/giphy.gif',
  'https://media.giphy.com/media/vUrwEOLtBwvsI/giphy.gif',
  'https://media.giphy.com/media/FqVM4892FHJ4Y/giphy.gif',
  'https://media.giphy.com/media/jR22gdcPiOLaE/giphy.gif',
  'https://media.giphy.com/media/W3a0zO282RVvsM1Dji/giphy.gif',
  'https://media.giphy.com/media/flL3vLgA1851m/giphy.gif',
  'https://media.giphy.com/media/l4FsLq2233f2s8wxy/giphy.gif',
  'https://media.giphy.com/media/11tdsyM4aWo8eI/giphy.gif',
  'https://media.giphy.com/media/bm2O3nXTcKJeU/giphy.gif',
  'https://media.giphy.com/media/zkppEMFvRX5FC/giphy.gif',
  'https://media.giphy.com/media/Kro48m8WZXlIs/giphy.gif',
  'https://media.giphy.com/media/S0o894i341w88/giphy.gif',
  'https://media.giphy.com/media/Amu15N72eK1t6/giphy.gif',
  'https://media.giphy.com/media/nyGFcsP0kAobm/giphy.gif',
  'https://media.giphy.com/media/s21v3B3neM920/giphy.gif',
  'https://media.giphy.com/media/o91R8E3j4k9tS/giphy.gif',
  'https://media.giphy.com/media/e25Y1pP7604E0/giphy.gif',
  'https://media.giphy.com/media/k5aB5a3iPq7f2/giphy.gif',
  'https://media.giphy.com/media/bGm9883JmgZtm/giphy.gif',
  'https://media.giphy.com/media/12VXIxKaGX35hm/giphy.gif',
  'https://media.giphy.com/media/lGpr3q3Wnt2g/giphy.gif',
  'https://media.giphy.com/media/vdbrUjzrUEy2I/giphy.gif',
  'https://media.giphy.com/media/nnP9B38R2gJ60/giphy.gif',
  'https://media.giphy.com/media/u011jM8fJmH04/giphy.gif',
  'https://media.giphy.com/media/QGc80334L80na/giphy.gif',
  'https://media.giphy.com/media/hnNyVPIXgVS3M/giphy.gif',
  'https://media.giphy.com/media/26AHPxxnSw1L9T1rW/giphy.gif',
  'https://media.giphy.com/media/3o7TKL33S1a9fUvIn6/giphy.gif',
  'https://media.giphy.com/media/D0G8J2R4g26S0/giphy.gif',
  'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif'
];

module.exports = {
  name: 'beijo',
  aliases: ['kiss', 'beijar'],
  description: 'Dê um beijo em alguém do servidor',
  slashData: new SlashCommandBuilder()
    .setName('beijo')
    .setDescription('Dê um beijo em alguém')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Quem você deseja beijar?')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Mencione alguém para beijar!');
    return enviarInteracao(message, message.author, target, false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    return enviarInteracao(interaction, interaction.user, target, true);
  }
};

async function enviarInteracao(contexto, autor, alvo, isSlash = false) {
  if (alvo.id === autor.id) {
    const msg = '💖 Você se ama tanto que tentou beijar o próprio espelho!';
    return isSlash ? contexto.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : contexto.reply(msg);
  }

  const gif = GIFS_BEIJO[Math.floor(Math.random() * GIFS_BEIJO.length)];

  const embed = new EmbedBuilder()
    .setDescription(`💋 **${autor}** deu um beijo carinhoso em **${alvo}**!`)
    .setImage(gif)
    .setColor('#FF69B4')
    .setTimestamp();

  const btnRetribuir = new ButtonBuilder()
    .setCustomId(`retribuir_beijo_${autor.id}_${alvo.id}`)
    .setLabel('💋 Retribuir Beijo')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(btnRetribuir);

  const resposta = isSlash
    ? await contexto.reply({ embeds: [embed], components: [row], fetchReply: true })
    : await contexto.reply({ embeds: [embed], components: [row] });

  const collector = resposta.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000
  });

  collector.on('collect', async interaction => {
    if (interaction.user.id !== alvo.id) {
      return interaction.reply({ content: '❌ Apenas quem recebeu o beijo pode retribuir!', flags: [MessageFlags.Ephemeral] });
    }

    const gifRetribuicao = GIFS_BEIJO[Math.floor(Math.random() * GIFS_BEIJO.length)];
    const embedRetribuido = new EmbedBuilder()
      .setDescription(`💋 **${alvo}** retribuiu o beijo de **${autor}**!`)
      .setImage(gifRetribuicao)
      .setColor('#FF1493')
      .setTimestamp();

    await interaction.reply({ embeds: [embedRetribuido] });
    collector.stop();
  });
}
