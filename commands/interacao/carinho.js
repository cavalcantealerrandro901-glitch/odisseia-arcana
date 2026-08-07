const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

const GIFS_CARINHO = [
  'https://media.giphy.com/media/5tmRHw632SmCIRvD2L/giphy.gif',
  'https://media.giphy.com/media/109ltfnjz50pK8/giphy.gif',
  'https://media.giphy.com/media/L2z7dnOduqE6Y/giphy.gif',
  'https://media.giphy.com/media/ARSp9T7wwxNcs/giphy.gif',
  'https://media.giphy.com/media/ye4mOfawcfOda/giphy.gif',
  'https://media.giphy.com/media/os5Bz1IRmXaik/giphy.gif',
  'https://media.giphy.com/media/N0CIxcy454Bgc/giphy.gif',
  'https://media.giphy.com/media/S8P32p6A4qO6s/giphy.gif',
  'https://media.giphy.com/media/ZfK4cXKJTTay1Ava29/giphy.gif',
  'https://media.giphy.com/media/M3a51DMeWvYUo/giphy.gif',
  'https://media.giphy.com/media/4f5R23Sj5E120/giphy.gif',
  'https://media.giphy.com/media/129NVCr3LflX1u/giphy.gif',
  'https://media.giphy.com/media/SvC0mB7T3eO4g/giphy.gif',
  'https://media.giphy.com/media/3o85xH5S1Pj2T4P7fa/giphy.gif',
  'https://media.giphy.com/media/12xmI3w2Cj2mU8/giphy.gif',
  'https://media.giphy.com/media/25445JvL7X8cM/giphy.gif',
  'https://media.giphy.com/media/kHOts8AniA2ve/giphy.gif',
  'https://media.giphy.com/media/1043fC1f3r9c5O/giphy.gif',
  'https://media.giphy.com/media/SnoT50sIqT5a0/giphy.gif',
  'https://media.giphy.com/media/l41YoV54ZT3T0kM4M/giphy.gif'
];

module.exports = {
  name: 'carinho',
  aliases: ['pat', 'cafune'],
  description: 'Faça carinho na cabeça de alguém',
  slashData: new SlashCommandBuilder()
    .setName('carinho')
    .setDescription('Faça carinho em alguém')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Em quem você deseja fazer carinho?')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Mencione alguém para fazer carinho!');
    return enviarInteracao(message, message.author, target, false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    return enviarInteracao(interaction, interaction.user, target, true);
  }
};

async function enviarInteracao(contexto, autor, alvo, isSlash = false) {
  if (alvo.id === autor.id) {
    const msg = '🐾 Você fez um afago na sua própria cabeça!';
    return isSlash ? contexto.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : contexto.reply(msg);
  }

  const gif = GIFS_CARINHO[Math.floor(Math.random() * GIFS_CARINHO.length)];

  const embed = new EmbedBuilder()
    .setDescription(`🐾 **${autor}** fez um carinho fofo na cabeça de **${alvo}**!`)
    .setImage(gif)
    .setColor('#FFD700')
    .setTimestamp();

  const btnRetribuir = new ButtonBuilder()
    .setCustomId(`retribuir_carinho_${autor.id}_${alvo.id}`)
    .setLabel('🐾 Retribuir Carinho')
    .setStyle(ButtonStyle.Secondary);

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
      return interaction.reply({ content: '❌ Apenas quem recebeu o carinho pode retribuir!', flags: [MessageFlags.Ephemeral] });
    }

    const gifRetribuicao = GIFS_CARINHO[Math.floor(Math.random() * GIFS_CARINHO.length)];
    const embedRetribuido = new EmbedBuilder()
      .setDescription(`🐾 **${alvo}** retribuiu o carinho em **${autor}**!`)
      .setImage(gifRetribuicao)
      .setColor('#FFA500')
      .setTimestamp();

    await interaction.reply({ embeds: [embedRetribuido] });
    collector.stop();
  });
}
