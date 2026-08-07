const https = require('https');

// GIFs de backup caso as APIs fiquem fora do ar ou o endpoint falhe
const fallbacks = {
  hug: ['https://i.imgur.com/r9aU297.gif', 'https://i.imgur.com/221i114.gif'],
  kiss: ['https://i.imgur.com/g11311s.gif', 'https://i.imgur.com/v10022s.gif'],
  slap: ['https://i.imgur.com/mE13a0S.gif', 'https://i.imgur.com/43110aS.gif'],
  pat: ['https://i.imgur.com/21aB001.gif', 'https://i.imgur.com/32aB002.gif'],
  punch: ['https://i.imgur.com/12aB004.gif'],
  bite: ['https://i.imgur.com/32aB006.gif'],
  dance: ['https://i.imgur.com/52aB008.gif'],
  wave: ['https://i.imgur.com/72aB010.gif']
};

/**
 * Faz requisição HTTP nativa do Node sem depender da versão do fetch
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AeternosBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Busca uma GIF animada com fallbacks garantidos
 */
async function getGif(action) {
  const cat = action.toLowerCase();

  // 1ª Tentativa: API Waifu.pics
  try {
    const data = await fetchJson(`https://api.waifu.pics/sfw/${cat}`);
    if (data && data.url) {
      console.log(`[GIF] Waifu.pics carregada: ${data.url}`);
      return data.url;
    }
  } catch (err) {
    // Falha silenciosa para tentar a próxima
  }

  // 2ª Tentativa: API Nekos.best
  try {
    const data = await fetchJson(`https://nekos.best/api/v2/${cat}`);
    if (data && data.results && data.results[0] && data.results[0].url) {
      console.log(`[GIF] Nekos.best carregada: ${data.results[0].url}`);
      return data.results[0].url;
    }
  } catch (err) {
    // Falha silenciosa para tentar o backup
  }

  // 3ª Tentativa: Backup do banco local
  const list = fallbacks[cat] || [];
  if (list.length > 0) {
    const fallbackUrl = list[Math.floor(Math.random() * list.length)];
    console.log(`[GIF] Backup carregado: ${fallbackUrl}`);
    return fallbackUrl;
  }

  console.log(`[GIF] Nenhuma imagem encontrada para: ${cat}`);
  return null;
}

module.exports = { getGif };
