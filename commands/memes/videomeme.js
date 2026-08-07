const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'videomeme',
  aliases: ['memevideo', 'vmeme', 'vidmeme'],
  description: 'Envia um vídeo de meme aleatório',
  slashData: new SlashCommandBuilder()
    .setName('videomeme')
    .setDescription('Envia um vídeo de meme aleatório'),

  async execute(message, args, client, prefix) {
    return enviarVideoMeme(message, false);
  },

  async executeSlash(interaction, client) {
    return enviarVideoMeme(interaction, true);
  }
};

async function enviarVideoMeme(contexto, isSlash = false) {
  const subreddits = ['shitposting', 'memevideos', 'Unexpected', 'HUEstation'];
  const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];

  try {
    const res = await fetch(`https://meme-api.com/gimme/${subreddit}`);
    const data = await res.json();

    if (data && data.url) {
      const content = `🎬 **${data.title}** *(r/${data.subreddit})*\n${data.url}`;
      return isSlash ? contexto.reply({ content }) : contexto.reply({ content });
    }
  } catch (error) {
    console.error('Erro ao procurar vídeo meme:', error);
  }

  const msg = '❌ Não foi possível carregar um vídeo de meme neste momento.';
  return isSlash ? contexto.reply({ content: msg }) : contexto.reply({ content: msg });
}
