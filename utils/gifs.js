// Banco de GIFs Ultra Leves (Carregamento Instantâneo no Discord)
const gifs = {
  hug: [
    'https://i.waifu.pics/Lq3yH0z.gif',
    'https://i.waifu.pics/7p9-2kH.gif',
    'https://i.waifu.pics/0g4s~P1.gif',
    'https://i.waifu.pics/9o-B931.gif',
    'https://i.waifu.pics/Rk5eW3X.gif'
  ],
  kiss: [
    'https://i.waifu.pics/aJpS-7g.gif',
    'https://i.waifu.pics/v4aM46X.gif',
    'https://i.waifu.pics/4~Z2o2O.gif',
    'https://i.waifu.pics/9H24i32.gif'
  ],
  slap: [
    'https://i.waifu.pics/S1K133X.gif',
    'https://i.waifu.pics/W2S~33X.gif',
    'https://i.waifu.pics/13~4~2O.gif',
    'https://i.waifu.pics/3~9gH32.gif'
  ],
  pat: [
    'https://i.waifu.pics/46k1~2O.gif',
    'https://i.waifu.pics/194m33X.gif',
    'https://i.waifu.pics/Kk~542O.gif',
    'https://i.waifu.pics/8m9~33X.gif'
  ],
  punch: [
    'https://i.waifu.pics/7-m~33X.gif',
    'https://i.waifu.pics/84~1~2O.gif',
    'https://i.waifu.pics/K4gM46X.gif'
  ],
  bite: [
    'https://i.waifu.pics/24k1~2O.gif',
    'https://i.waifu.pics/494m33X.gif'
  ],
  dance: [
    'https://i.waifu.pics/7k1~2O.gif',
    'https://i.waifu.pics/94m33X.gif'
  ],
  wave: [
    'https://i.waifu.pics/1k1~2O.gif',
    'https://i.waifu.pics/34m33X.gif'
  ]
};

/**
 * Retorna uma GIF animada leve de acordo com a ação
 */
function getGif(action) {
  const list = gifs[action];
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = { getGif, gifs };
