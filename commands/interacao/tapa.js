const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

const GIFS_TAPA = [
  'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
  'https://media.giphy.com/media/j3iGKfXRKlLqw/giphy.gif',
  'https://media.giphy.com/media/Zau0yRL15t84w/giphy.gif',
  'https://media.giphy.com/media/mEtSQlx3yv62A/giphy.gif',
  'https://media.giphy.com/media/K1tgb1IUeBOXS/giphy.gif',
  'https://media.giphy.com/media/xUO4t2gkWBxYSqBKSV/giphy.gif',
  'https://media.giphy.com/media/uG3lKMYA5ScA8/giphy.gif',
  'https://media.giphy.com/media/1081fLgl3P3y1O/giphy.gif',
  'https://media.giphy.com/media/L3v3bY2uM2cGA/giphy.gif',
  'https://media.giphy.com/media/3XlEk2dbJgJuU/giphy.gif',
  'https://media.giphy.com/media/13m24iFmhomZi0/giphy.gif',
  'https://media.giphy.com/media/v4P9A2T1vPq24/giphy.gif',
  'https://media.giphy.com/media/Q8OPrLV04OZ3y/giphy.gif',
  'https://media.giphy.com/media/Y6c59hTH3T8aY/giphy.gif',
  'https://media.giphy.com/media/WL8aC25089vBS/giphy.gif',
  'https://media.giphy.com/media/qS8P2q8e3Lq7K/giphy.gif',
  'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
  'https://media.giphy.com/media/xXDu7guZKjWM8/giphy.gif',
  'https://media.giphy.com/media/12t3Awo4s3cve0/giphy.gif',
  'https://media.giphy.com/media/ToMjGpz81S7usvTIM8w/giphy.gif',
  'https://media.giphy.com/media/s5CJw8UPITK6I/giphy.gif',
  'https://media.giphy.com/media/mr9I6U9uC7e23P4jA0/giphy.gif',
  'https://media.giphy.com/media/E8S79m6D9qG3A/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Zudm9mOHZ5bmt3aDF0bWZ6eWhmOHM5cGZpMjU4ZndpM3JpZnNmbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3XlEk2dbJgJuU/giphy.gif',
  'https://media.giphy.com/media/3o7TKoWZ53vMML34T6/giphy.gif',
  'https://media.giphy.com/media/l0G18R8B30G1vRkO4/giphy.gif',
  'https://media.giphy.com/media/xT39D7O9Xj1Jq15Poc/giphy.gif',
  'https://media.giphy.com/media/l2R013mIf1ZXdvoyI/giphy.gif',
  'https://media.giphy.com/media/3o6ozrozM2A3MkWmYw/giphy.gif',
  'https://media.giphy.com/media/l0HlCqV35hdEg2GU8/giphy.gif'
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
