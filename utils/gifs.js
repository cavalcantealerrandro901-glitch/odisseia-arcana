// Banco de imagens e GIFs centralizado do bot Aeternos (Links de CDNs estáveis)
const gifs = {
  hug: [
    'https://i.imgur.com/r9aU297.gif',
    'https://i.imgur.com/221i114.gif',
    'https://i.imgur.com/4oAio2W.gif',
    'https://i.imgur.com/3j3gA9s.gif'
  ],
  kiss: [
    'https://i.imgur.com/g11311s.gif',
    'https://i.imgur.com/v10022s.gif',
    'https://i.imgur.com/33aA11z.gif'
  ],
  slap: [
    'https://i.imgur.com/mE13a0S.gif',
    'https://i.imgur.com/43110aS.gif',
    'https://i.imgur.com/2aB001x.gif'
  ],
  pat: [
    'https://i.imgur.com/21aB001.gif',
    'https://i.imgur.com/32aB002.gif',
    'https://i.imgur.com/45aB003.gif'
  ],
  punch: [
    'https://i.imgur.com/12aB004.gif',
    'https://i.imgur.com/22aB005.gif'
  ],
  bite: [
    'https://i.imgur.com/32aB006.gif',
    'https://i.imgur.com/42aB007.gif'
  ],
  dance: [
    'https://i.imgur.com/52aB008.gif',
    'https://i.imgur.com/62aB009.gif'
  ],
  wave: [
    'https://i.imgur.com/72aB010.gif'
  ]
};

/**
 * Retorna uma GIF aleatória de acordo com o tipo da ação
 * @param {string} action - Nome da ação (hug, kiss, slap, pat, punch, bite, dance, wave)
 * @returns {string|null} URL da imagem
 */
function getGif(action) {
  const list = gifs[action];
  if (!list || list.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

module.exports = { getGif, gifs };
