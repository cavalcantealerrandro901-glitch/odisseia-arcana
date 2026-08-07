// Banco de GIFs Animados Diretos (Giphy CDN)
const gifs = {
  hug: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z2Z3J3MnB4ZzNzY3RwYXhwbTV2Z2kzcXZkZXZ3ZjZxaDlsZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3M4NpbLCTxBqU/giphy.gif',
    'https://media.giphy.com/media/l0GE2O6U8yL3lqRtm/giphy.gif',
    'https://media.giphy.com/media/z1QQ47776qXTO/giphy.gif',
    'https://media.giphy.com/media/10gA888yL2WQ2A/giphy.gif'
  ],
  kiss: [
    'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
    'https://media.giphy.com/media/kC397rpnJ3M8E/giphy.gif',
    'https://media.giphy.com/media/FqSPe48M35MBy/giphy.gif'
  ],
  slap: [
    'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
    'https://media.giphy.com/media/j3iGKfXRKlLqw/giphy.gif',
    'https://media.giphy.com/media/Zau0yRL17uzdK/giphy.gif'
  ],
  pat: [
    'https://media.giphy.com/media/5tmRHw632f21D4Gehj/giphy.gif',
    'https://media.giphy.com/media/109ltuoSQT212w/giphy.gif'
  ],
  punch: [
    'https://media.giphy.com/media/119i1ebWTm3px6/giphy.gif',
    'https://media.giphy.com/media/l1J3G5lf06vi58EIE/giphy.gif'
  ],
  bite: [
    'https://media.giphy.com/media/oR7OedP8kO48U/giphy.gif'
  ],
  dance: [
    'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    'https://media.giphy.com/media/13m24a61m383E4/giphy.gif'
  ],
  wave: [
    'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif'
  ]
};

/**
 * Retorna uma GIF animada aleatória de acordo com o tipo da ação
 */
function getGif(action) {
  const list = gifs[action];
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = { getGif, gifs };
