const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'rank',
  aliases: ['rich', 'top'],
  description: 'Exibe o ranking dos membros mais ricos do servidor',
  slashData: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Exibe o ranking dos membros mais ricos do servidor'),

  async execute(message, args, client) {
    return exibirRanking(message, client, message.author);
  },

  async executeSlash(interaction, client) {
    return exibirRanking(interaction, client, interaction.user, true);
  }
};

async function exibirRanking(contexto, client, autor, isSlash = false) {
  const todosOsDados = await db.all();
  const mapaSaldos = new Map();

  // Calcula o total (carteira + banco) para cada usuário
  for (const elemento of todosOsDados) {
    const chave = elemento.key;
    const valor = elemento.value;

    if (chave.startsWith('carteira_') || chave.startsWith('banco_')) {
      const userId = chave.split('_')[1];
      const saldoAtual = mapaSaldos.get(userId) || 0;
      mapaSaldos.set(userId, saldoAtual + valor);
    }
  }

  // Converte para array e ordena do maior para o menor
  const rankingOrdenado = Array.from(mapaSaldos.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (rankingOrdenado.length === 0) {
    const msg = 'ℹ️ Ainda não há dados de economia registrados no servidor.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  let descricaoRank = '';
  const medalhas = ['🥇', '🥈', '🥉'];

  for (let i = 0; i < rankingOrdenado.length; i++) {
    const [userId, total] = rankingOrdenado[i];
    const user = await client.users.fetch(userId).catch(() => null);
    const nomeUser = user ? user.tag : `Usuário Desconhecido (\`${userId}\`)`;
    const posicao = medalhas[i] || `**#${i + 1}**`;

    descricaoRank += `${posicao} **${nomeUser}** — \`${total.toLocaleString()}\` 🪙\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 Ranking Econômico — Os Mais Ricos')
    .setColor('#f1c40f')
    .setDescription(descricaoRank)
    .setFooter({ text: `Solicitado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
