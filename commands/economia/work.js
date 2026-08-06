const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

const TEMPO_COOLDOWN = 30 * 60 * 1000; // 30 minutos em milissegundos

// Tabela Ampliada de Cargos Divinos (9 Ranks)
const CARGOS_DIVINOS = [
  { nome: '⚡ Mortal Aprendiz', xpNecessario: 100, minAlmas: 1000, maxAlmas: 5000 },
  { nome: '⚔️ Guerreiro Celestial', xpNecessario: 250, minAlmas: 5000, maxAlmas: 15000 },
  { nome: '🏛️ Senhor do Olimpo', xpNecessario: 500, minAlmas: 15000, maxAlmas: 30000 },
  { nome: '🔥 Titã Inabalável', xpNecessario: 1000, minAlmas: 30000, maxAlmas: 45000 },
  { nome: '🌌 Guardião do Vazio', xpNecessario: 2000, minAlmas: 45000, maxAlmas: 65000 },
  { nome: '🌟 Arconte das Estrelas', xpNecessario: 3500, minAlmas: 65000, maxAlmas: 90000 },
  { nome: '👁️ Entidade Primordial', xpNecessario: 5000, minAlmas: 90000, maxAlmas: 120000 },
  { nome: '🌠 Soberano do Multiverso', xpNecessario: 8000, minAlmas: 120000, maxAlmas: 160000 },
  { nome: '👑 Deus Absurdo do Aeternus', xpNecessario: Infinity, minAlmas: 160000, maxAlmas: 200000 }
];

const TRABALHOS_EPICOS = [
  'Forjou uma espada cósmica nos vulcões do Olimpo',
  'Canalizou a energia do caos para reabrir os portões do Aeternus',
  'Derrotou uma horda de titãs nas profundezas do abismo',
  'Dominou tempestades estelares e colheu essências de luz',
  'Liderou um exército celestial na batalha final das galáxias',
  'Selou uma fenda temporal no tecido do multiverso',
  'Purificou almas corrompidas no núcleo da nebulosa negra',
  'Reescreveu as leis da física no plano astral supremacy'
];

module.exports = {
  name: 'work',
  aliases: ['trabalhar', 'labor', 'jornada'],
  description: 'Execute seu trabalho divino para obter Almas e XP no Aeternus',
  slashData: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Execute seu trabalho divino para obter Almas e XP'),

  async execute(message, args, client) {
    iniciarNotificadorProativoWork(client);
    return processarWork(message, message.author);
  },

  async executeSlash(interaction, client) {
    iniciarNotificadorProativoWork(client);
    return processarWork(interaction, interaction.user, true);
  }
};

async function processarWork(contexto, autor, isSlash = false) {
  const chaveCooldown = `work_cooldown_${autor.id}`;
  const chaveCarteira = `carteira_${autor.id}`;
  const chaveBanco = `banco_${autor.id}`;
  const chaveRank = `work_rank_${autor.id}`;
  const chaveXP = `work_xp_${autor.id}`;

  const ultimoTrabalho = (await db.get(chaveCooldown)) || 0;
  const agora = Date.now();

  // Verificação de Cooldown (30 Minutos)
  if (agora - ultimoTrabalho < TEMPO_COOLDOWN) {
    const tempoRestante = TEMPO_COOLDOWN - (agora - ultimoTrabalho);
    const minutos = Math.floor(tempoRestante / (1000 * 60));
    const segundos = Math.floor((tempoRestante % (1000 * 60)) / 1000);

    const embedCansado = new EmbedBuilder()
      .setTitle('🧘 SEU CORPO DIVINO REQUER REPOUSO! 🧘')
      .setColor('#9b59b6')
      .setThumbnail(autor.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `🏛️ **CALMA, ENTIDADE SUPREMA!**\n\n` +
        `Sua energia cósmica está se esgotando. Aguarde o tempo de regeneração para executar outro feito divino!\n\n` +
        `⏳ **Descanso Restante:** \`${minutos}m${segundos}s\`\n\n` +
        `*Seus oráculos irão lhe notificar no PV assim que suas forças forem restauradas!*`
      )
      .setFooter({ text: 'Aeternus Trabalho • Cooldown de 30 Minutos' })
      .setTimestamp();

    return isSlash ? contexto.reply({ embeds: [embedCansado], ephemeral: true }) : contexto.reply({ embeds: [embedCansado] });
  }

  // Obter Cargo e XP Atuais
  let rankIndex = (await db.get(chaveRank)) || 0;
  let xpAtual = (await db.get(chaveXP)) || 0;

  if (rankIndex >= CARGOS_DIVINOS.length) rankIndex = CARGOS_DIVINOS.length - 1;
  let cargoAtual = CARGOS_DIVINOS[rankIndex];

  // Sorteio de Almas baseado no Cargo Atual
  const almasGanhadas = Math.floor(Math.random() * (cargoAtual.maxAlmas - cargoAtual.minAlmas + 1)) + cargoAtual.minAlmas;
  const xpGanhado = Math.floor(Math.random() * (45 - 20 + 1)) + 20;

  // Atualizar Saldos e XP
  const saldoCarteira = (await db.get(chaveCarteira)) || 0;
  const saldoBanco = (await db.get(chaveBanco)) || 0;
  
  const novaCarteira = saldoCarteira + almasGanhadas;
  const totalPatrimonio = novaCarteira + saldoBanco;
  let novoXP = xpAtual + xpGanhado;

  let subiuDeCargo = false;
  let nomeAntigoCargo = cargoAtual.nome;

  // Lógica de Subir de Cargo / Zerar XP
  if (novoXP >= cargoAtual.xpNecessario && rankIndex < CARGOS_DIVINOS.length - 1) {
    subiuDeCargo = true;
    rankIndex += 1;
    novoXP = 0;
    await db.set(chaveRank, rankIndex);
  }

  const cargoFinal = CARGOS_DIVINOS[rankIndex];

  // Salvar no Banco de Dados
  await db.set(chaveCarteira, novaCarteira);
  await db.set(chaveXP, novoXP);
  await db.set(chaveCooldown, agora);
  await db.set(`work_notify_${autor.id}`, true);

  const trabalhoSorteado = TRABALHOS_EPICOS[Math.floor(Math.random() * TRABALHOS_EPICOS.length)];

  let textoEvolucao = '';
  if (subiuDeCargo) {
    textoEvolucao = `\n\n🎉 **EVOLUÇÃO DIVINA DETECTADA!** 🎉\nVocê superou os limites do cargo **${nomeAntigoCargo}** e ascendeu para **${cargoFinal.nome}**!\n*Seus ganhos futuros de Almas aumentaram drasticamente!*`;
  }

  const embedSucesso = new EmbedBuilder()
    .setTitle('🌌 TRABALHO DIVINO EXECUTADO COM SUCESSO! 🌌')
    .setColor('#f1c40f')
    .setThumbnail(autor.displayAvatarURL({ dynamic: true }))
    .setDescription(
      `💥 **O UNIVERSO RECONHECEU O SEU PODER!** 💥\n\n` +
      `📜 **Feito Realizado:** *${trabalhoSorteado}*\n\n` +
      `🔮 **Almas Absorvidas:** \`+${almasGanhadas.toLocaleString('pt-BR')}\` ✨\n` +
      `⭐ **XP Adquirido:** \`+${xpGanhado} XP\`\n` +
      `👑 **Cargo Divino:** **${cargoFinal.nome}**\n` +
      `📊 **Progresso XP:** \`${novoXP} /${cargoFinal.xpNecessario === Infinity ? 'MAX' : cargoFinal.xpNecessario.toLocaleString('pt-BR') + ' XP'}\`${textoEvolucao}\n\n` +
      `👛 **Carteira:** \`${novaCarteira.toLocaleString('pt-BR')}\` ✨\n` +
      `💎 **Total Patrimônio:** \`${totalPatrimonio.toLocaleString('pt-BR')}\` ✨`
    )
    .setFooter({ text: 'Aeternus Economia • Volte em 30 minutos!' })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embedSucesso] });
  } else {
    await contexto.reply({ embeds: [embedSucesso] });
  }
}

// Loop de Verificação para Enviar Notificação no PV após 30 min
let notificacaoWorkAtiva = false;
function iniciarNotificadorProativoWork(client) {
  if (notificacaoWorkAtiva) return;
  notificacaoWorkAtiva = true;

  setInterval(async () => {
    const todosOsDados = await db.all();
    const agora = Date.now();

    for (const item of todosOsDados) {
      if (item.key.startsWith('work_notify_') && item.value === true) {
        const userId = item.key.replace('work_notify_', '');
        const ultimoTrabalho = (await db.get(`work_cooldown_${userId}`)) || 0;

        if (agora - ultimoTrabalho >= TEMPO_COOLDOWN) {
          try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
              const embedPV = new EmbedBuilder()
                .setTitle('⚡ SUAS FORÇAS FORAM RESTAURADAS NO AETERNUS!')
                .setColor('#f1c40f')
                .setDescription(
                  `✨ **O tempo de descanso de 30 minutos chegou ao fim!** ✨\n\n` +
                  `Sua energia cósmica foi renovada. Acesse o servidor e use \`O.work\` ou \`/work\` para executar seu trabalho divino, acumular mais Almas e evoluir de Cargo!`
                )
                .setTimestamp();

              await user.send({ embeds: [embedPV] }).catch(() => {});
              await db.set(`work_notify_${userId}`, false);
            }
          } catch (err) {
            // PV fechado pelo usuário
          }
        }
      }
    }
  }, 30000);
}
