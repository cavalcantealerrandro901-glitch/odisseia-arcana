const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

const GIFS_ABRACO = [
  'https://media.giphy.com/media/phP4alS1211E2d2J3o/giphy.gif',
  'https://media.giphy.com/media/l2QDM9Jnim1YV55YA/giphy.gif',
  'https://media.giphy.com/media/OD5ELByOjry6I/giphy.gif',
  'https://media.giphy.com/media/u9Bx335zwZL32/giphy.gif'
];

module.exports = {
  name: 'abraco',
  aliases: ['hug', 'abracar'],
  description: 'Dê um abraço quentinho em alguém',
  slashData: new SlashCommandBuilder()
    .setName('abraco')
    .setDescription('Dê um abraço em alguém')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Quem você deseja abraçar?')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Mencione alguém para abraçar!');
    return enviarInteracao(message, message.author, target, false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    return enviarInteracao(interaction, interaction.user, target, true);
  }
};

async function enviarInteracao(contexto, autor, alvo, isSlash = false) {
  if (alvo.id === autor.id) {
    const msg = '🫂 Você se deu um auto-abraço bem aconchegante!';
    return isSlash ? contexto.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : contexto.reply(msg);
  }

  const gif = GIFS_ABRACO[Math.floor(Math.random() * GIFS_ABRACO.length)];

  const embed = new EmbedBuilder()
    .setDescription(`🫂 **${autor}** deu um abraço bem apertado em **${alvo}**!`)
    .setImage(gif)
    .setColor('#00BFFF')
    .setTimestamp();

  const btnRetribuir = new ButtonBuilder()
    .setCustomId(`retribuir_abraco_${autor.id}_${alvo.id}`)
    .setLabel('🫂 Retribuir Abraço')
    .setStyle(ButtonStyle.Success);

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
      return interaction.reply({ content: '❌ Apenas quem recebeu o abraço pode retribuir!', flags: [MessageFlags.Ephemeral] });
    }

    const gifRetribuicao = GIFS_ABRACO[Math.floor(Math.random() * GIFS_ABRACO.length)];
    const embedRetribuido = new EmbedBuilder()
      .setDescription(`🫂 **${alvo}** retribuiu o abraço de **${autor}**!`)
      .setImage(gifRetribuicao)
      .setColor('#1E90FF')
      .setTimestamp();

    await interaction.reply({ embeds: [embedRetribuido] });
    collector.stop();
  });
}
