const https = require('https');

// Mapeamento dos comandos em português/alias para o nome exato aceito pelas APIs
const categoryMap = {
  hug: 'hug',
  kiss: 'kiss',
  slap: 'slap',
  pat: 'pat',
  carinho: 'pat',
  punch: 'bite', // ou 'slap' como fallback
  soco: 'slap',
  bite: 'bite',
  morder: 'bite',
  dance: 'dance',
  dancar: 'dance',
  wave: 'wave',
  acenar: 'wave'
};

// Backup com links estáveis do Tenor/Imgur direto
const fallbacks = {
  hug: ['https://media1.tenor.com/m/5G106r_zV38AAAAC/anime-hug.gif'],
  kiss: ['https://media1.tenor.com/m/v4P0223J99AAAAAC/anime-kiss.gif'],
  slap: ['https://media1.tenor.com/m/E3_1g34E6yAAAAAC/anime-slap.gif'],
  pat: ['https://media1.tenor.com/m/Y341628169AAAAAC/anime-head-pat.gif']
};

/**
 * Função utilitária para requisição HTTPS segura
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AeternosBot/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Status HTTP ${res.statusCode}`));
      }
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
 * Busca GIF com mapeamento e proteção contra erros no console
 */
async function getGif(action) {
  const cat = categoryMap[action.toLowerCase()] || action.toLowerCase();

  // 1ª Tentativa: API Waifu.pics
  try {
    const data = await fetchJson(`https://api.waifu.pics/sfw/${cat}`);
    if (data && data.url) {
      return data.url;
    }
  } catch (err) {
    // Ignora o erro e passa para a próxima tentativa
  }

  // 2ª Tentativa: API Nekos.best
  try {
    const data = await fetchJson(`https://nekos.best/api/v2/${cat}`);
    if (data && data.results && data.results[0] && data.results[0].url) {
      return data.results[0].url;
    }
  } catch (err) {
    // Ignora o erro e vai para o backup
  }

  // 3ª Tentativa: Imagem de backup local
  const list = fallbacks[cat] || fallbacks.slap;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = { getGif };
