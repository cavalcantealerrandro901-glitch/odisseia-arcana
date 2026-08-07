const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'meme',
  aliases: ['memes', 'humor', 'engracado', 'videomeme'],
  description: 'Envia um vídeo de meme aleatório',
  slashData: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Envia um vídeo de meme aleatório'),

  async execute(message, args, client, prefix) {
    return enviarMemeVideo(message, false);
  },

  async executeSlash(interaction, client) {
    // Evita timeout do Discord avisando que o bot está processando
    await interaction.deferReply();
    return enviarMemeVideo(interaction, true);
  }
};

async function enviarMemeVideo(contexto, isSlash = false) {
  const subreddits = ['memevideos', 'shitposting', 'Unexpected', 'HUEstation', 'dankvideos'];
  const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];

  try {
    const res = await fetch(`https://meme-api.com/gimme/${subreddit}`);
    const data = await res.json();

    if (data && data.url) {
      const content = `🎬 **${data.title}** *(r/${data.subreddit})*\n${data.url}`;
      
      return isSlash ? contexto.editReply({ content }) : contexto.reply({ content });
    }
  } catch (error) {
    console.error('Erro ao procurar vídeo meme:', error);
  }

  const msg = '❌ Não foi possível carregar um vídeo de meme neste momento.';
  return isSlash ? contexto.editReply({ content: msg }) : contexto.reply({ content: msg });
}
