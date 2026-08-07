const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'meme',
  aliases: ['memes', 'humor', 'engracado'],
  description: 'Exibe um meme aleatório',
  slashData: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Exibe um meme aleatório'),

  async execute(message, args, client, prefix) {
    return enviarMeme(message, false);
  },

  async executeSlash(interaction, client) {
    return enviarMeme(interaction, true);
  }
};

async function enviarMeme(contexto, isSlash = false) {
  const subreddits = ['memes', 'dankmemes', 'HUEstation', 'EU_NEV'];
  const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];

  try {
    const res = await fetch(`https://meme-api.com/gimme/${subreddit}`);
    const data = await res.json();

    if (data && data.url) {
      const embed = new EmbedBuilder()
        .setTitle(data.title || 'Meme')
        .setURL(data.postLink || data.url)
        .setImage(data.url)
        .setColor('#F1C40F')
        .setFooter({ text: `👍 ${data.ups || 0} | r/${data.subreddit}` })
        .setTimestamp();

      return isSlash ? contexto.reply({ embeds: [embed] }) : contexto.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Erro ao procurar meme:', error);
  }

  const msg = '❌ Não foi possível carregar um meme neste momento.';
  return isSlash ? contexto.reply({ content: msg }) : contexto.reply({ content: msg });
}
