/**
 * Busca uma GIF animada em tempo real através das APIs oficiais Waifu.pics e Nekos.best
 */
async function getGif(action) {
  const category = action.toLowerCase();

  // 1ª Tentativa: Waifu.pics API
  try {
    const response = await fetch(`https://api.waifu.pics/sfw/${category}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.url) return data.url;
    }
  } catch (error) {
    console.error(`Erro na API Waifu.pics (${category}):`, error.message);
  }

  // 2ª Tentativa (Fallback): Nekos.best API
  try {
    const response = await fetch(`https://nekos.best/api/v2/${category}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.results && data.results[0] && data.results[0].url) {
        return data.results[0].url;
      }
    }
  } catch (error) {
    console.error(`Erro na API Nekos.best (${category}):`, error.message);
  }

  return null;
}

module.exports = { getGif };
