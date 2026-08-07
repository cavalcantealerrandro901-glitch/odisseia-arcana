const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

const GIFS_TAPA = [
  'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
  'https://media.giphy.com/media/j3iGKfXRKlLqw/giphy.gif',
  'https://media.giphy.com/media/Zau0yRL15t84w/giphy.gif',
  'https://media.giphy.com/media/mEtSQlx3yv62A/giphy.gif'
];

module.exports = {
  name: 'tapa',
  aliases: ['slap', 'bater'],
  description: 'Dê um tapa em alguém do servidor',
  slashData: new SlashCommandBuilder()
    .setName('tapa')
    .setDescription('Dê um tapa em alguém')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Quem você deseja dar um tapa?')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Mencione alguém para dar um tapa!');
    return enviarInteracao(message, message.author, target, false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    return enviarInteracao(interaction, interaction.user, target, true);
  }
};

async function enviarInteracao(contexto, autor, alvo, isSlash = false) {
  if (alvo.id === autor.id) {
    const msg = '🤦‍♂️ Você deu um tapa na própria cara... Por quê?!';
    return isSlash ? contexto.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : contexto.reply(msg);
  }

  const gif = GIFS_TAPA[Math.floor(Math.random() * GIFS_TAPA.length)];

  const embed = new EmbedBuilder()
    .setDescription(`🖐️ **${autor}** deu um tapa em **${alvo}**!`)
    .setImage(gif)
    .setColor('#FF4500')
    .setTimestamp();

  const btnRetribuir = new ButtonBuilder()
    .setCustomId(`retribuir_tapa_${autor.id}_${alvo.id}`)
    .setLabel('💥 Devolver Tapa')
    .setStyle(ButtonStyle.Danger);

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
      return interaction.reply({ content: '❌ Apenas quem levou o tapa pode devolver!', flags: [MessageFlags.Ephemeral] });
    }

    const gifRetribuicao = GIFS_TAPA[Math.floor(Math.random() * GIFS_TAPA.length)];
    const embedRetribuido = new EmbedBuilder()
      .setDescription(`💥 **${alvo}** devolveu o tapa em **${autor}** com o dobro de força!`)
      .setImage(gifRetribuicao)
      .setColor('#DC143C')
      .setTimestamp();

    await interaction.reply({ embeds: [embedRetribuido] });
    collector.stop();
  });
}
