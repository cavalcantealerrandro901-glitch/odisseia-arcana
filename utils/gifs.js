// Banco de imagens e GIFs centralizado do bot Aeternos
const gifs = {
  hug: [
    'https://media.tenor.com/kCZ9T3xP33AAAAAC/anime-hug.gif',
    'https://media.tenor.com/1T1HuA095dAAAAAC/anime-hug.gif',
    'https://media.tenor.com/XweO6a092dAAAAAC/hug-anime.gif',
    'https://media.tenor.com/7o2DzD323qUAAAAC/anime-hug.gif',
    'https://media.tenor.com/2b31131154AAAAAC/anime-hug.gif'
  ],
  kiss: [
    'https://media.tenor.com/du7yE6yG63AAAAAC/anime-kiss.gif',
    'https://media.tenor.com/v4P0223J99AAAAAC/anime-kiss.gif',
    'https://media.tenor.com/8121921821AAAAAC/anime-kiss.gif',
    'https://media.tenor.com/F031231823AAAAAC/anime-kiss.gif'
  ],
  slap: [
    'https://media.tenor.com/E3_1g34E6yAAAAAC/anime-slap.gif',
    'https://media.tenor.com/Ws6326Ey34AAAAAC/slap-anime.gif',
    'https://media.tenor.com/172619281AAAAAC/anime-slap.gif',
    'https://media.tenor.com/978123812AAAAAC/anime-slap.gif'
  ],
  pat: [
    'https://media.tenor.com/Y341628169AAAAAC/anime-head-pat.gif',
    'https://media.tenor.com/E62788282AAAAAC/pat-anime.gif',
    'https://media.tenor.com/918239123AAAAAC/head-pat.gif'
  ],
  punch: [
    'https://media.tenor.com/q231718211AAAAAC/anime-punch.gif',
    'https://media.tenor.com/712391238AAAAAC/anime-punch.gif'
  ],
  bite: [
    'https://media.tenor.com/9716281611AAAAAC/anime-bite.gif',
    'https://media.tenor.com/812391823AAAAAC/anime-bite.gif'
  ]
};

/**
 * Retorna uma GIF aleatória de acordo com o tipo da ação
 * @param {string} action - Nome da ação (hug, kiss, slap, pat, punch, bite)
 * @returns {string|null} URL da imagem
 */
function getGif(action) {
  const list = gifs[action];
  if (!list || list.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

module.exports = { getGif, gifs };
