const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

const CARGOS_DIVINOS = [
  'Mortal Aprendiz',
  'Guerreiro Celestial',
  'Senhor do Olimpo',
  'Titã Inabalável',
  'Guardião do Vazio',
  'Arconte das Estrelas',
  'Entidade Primordial',
  'Soberano do Multiverso',
  'Deus Absurdo do Aeternus'
];

module.exports = {
  name: 'work',
  aliases: ['trabalhar', 'w'],
  description: 'Trabalhe para ganhar almas e evoluir seu Rank Divino no Aeternus',
  slashData: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabalhe para ganhar almas e evoluir seu Rank Divino no Aeternus'),

  async execute(message, args, client) {
    return executarWork(message, message.author, client, false);
  },

  async executeSlash(interaction, client) {
    return executarWork(interaction, interaction.user, client, true);
  }
};

async function executarWork(contexto, user, client, isSlash = false) {
  const userId = user.id;
  const cooldownKey = `work_cooldown_${userId}`;
  const rankKey = `work_rank_${userId}`;
  const countKey = `work_count_${userId}`;
  const carteiraKey = `carteira_${userId}`;
  const notifyKey = `work_notify_${userId}`;

  const ultimoWork = (await db.get(cooldownKey)) || 0;
  const agora = Date.now();
  const tempoEspera = 30 * 60 * 1000; // 30 minutos

  if (agora - ultimoWork < tempoEspera) {
    const restante = tempoEspera - (agora - ultimoWork);
    const minutos = Math.floor(restante / (1000 * 60));
    const segundos = Math.floor((restante % (1000 * 60)) / 1000);

    const msgCooldown = `⏱️ Você precisa descansar! Aguarde **${minutos}m ${segundos}s** para trabalhar novamente no Aeternus.`;
    return isSlash 
      ? contexto.reply({ content: msgCooldown, flags: [MessageFlags.Ephemeral] }) 
      : contexto.reply(msgCooldown);
  }

  // Incrementar contador de trabalhos
  let trabalhosRealizados = ((await db.get(countKey)) || 0) + 1;
  await db.set(countKey, trabalhosRealizados);

  // Evolução de Rank Divino
  let rankIndex = (await db.get(rankKey)) || 0;
  const trabalhosParaProximoRank = (rankIndex + 1) * 10;
  
  let subiuDeRank = false;
  if (trabalhosRealizados >= trabalhosParaProximoRank && rankIndex < CARGOS_DIVINOS.length - 1) {
    rankIndex += 1;
    await db.set(rankKey, rankIndex);
    subiuDeRank = true;
  }

  const multiplicador = rankIndex + 1;
  const ganhoBase = Math.floor(Math.random() * 200) + 100;
  const totalGanhos = ganhoBase * multiplicador;

  const carteiraAtual = (await db.get(carteiraKey)) || 0;
  const novoSaldo = carteiraAtual + totalGanhos;
  await db.set(carteiraKey, novoSaldo);
  await db.set(cooldownKey, agora);
  await db.delete(`work_notified_${userId}`); // Reseta status de notificação enviada

  const nomeRank = CARGOS_DIVINOS[rankIndex];
  const notificacaoAtiva = await db.get(notifyKey);

  // Botão de Notificação / Lembrete
  const btnNotificacao = new ButtonBuilder()
    .setCustomId(`toggle_notify_${userId}`)
    .setLabel(notificacaoAtiva ? '🔔 Lembrete Ativado' : '🔕 Ativar Lembrete (30m)')
    .setStyle(notificacaoAtiva ? ButtonStyle.Success : ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(btnNotificacao);

  let textoMensagem = 
    `🛠️ **JORNADA DE TRABALHO CÓSMICA — AETERNUS**\n\n` +
    `Membro: <@${userId}>\n` +
    `Rank Divino: **${nomeRank}** (Multiplicador x${multiplicador})\n` +
    `Almas Coletadas: \`+${totalGanhos.toLocaleString('pt-BR')}\` almas\n` +
    `Saldo na Carteira: \`${novoSaldo.toLocaleString('pt-BR')}\` almas\n` +
    `Total de Trabalhos Concluídos: \`${trabalhosRealizados}\``;

  if (subiuDeRank) {
    textoMensagem += `\n\n🎉 **ASCENSÃO DIVINA!** Você subiu para o Rank **${nomeRank}**! Seus ganhos futuros aumentaram!`;
  }

  const msgResposta = isSlash
    ? await contexto.reply({ content: textoMensagem, components: [row], fetchReply: true })
    : await contexto.reply({ content: textoMensagem, components: [row] });

  // Collector para o Botão
  const collector = msgResposta.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== userId) {
      return i.reply({ content: 'Apenas quem trabalhou pode configurar este lembrete.', flags: [MessageFlags.Ephemeral] });
    }

    const estadoAtual = await db.get(notifyKey);
    const novoEstado = !estadoAtual;
    await db.set(notifyKey, novoEstado);

    btnNotificacao
      .setLabel(novoEstado ? '🔔 Lembrete Ativado' : '🔕 Ativar Lembrete (30m)')
      .setStyle(novoEstado ? ButtonStyle.Success : ButtonStyle.Secondary);

    const rowAtualizada = new ActionRowBuilder().addComponents(btnNotificacao);

    await i.update({ components: [rowAtualizada] });
    await i.followUp({
      content: novoEstado 
        ? '✅ Lembrete ativado! O bot tentará enviar-lhe uma mensagem privada em 30 minutos.' 
        : '🔕 Lembrete desativado com sucesso.',
      flags: [MessageFlags.Ephemeral]
    });
  });
}

// Verificação periódica de notificações a cada minuto
setInterval(async () => {
  try {
    const todosDados = await db.all();
    if (!Array.isArray(todosDados)) return;

    const agora = Date.now();
    const tempoEspera = 30 * 60 * 1000; // 30 minutos

    for (const item of todosDados) {
      if (item?.key && typeof item.key === 'string' && item.key.startsWith('work_notify_') && item.value === true) {
        const userId = item.key.replace('work_notify_', '');
        const ultimoWork = (await db.get(`work_cooldown_${userId}`)) || 0;

        if (agora - ultimoWork >= tempoEspera) {
          const jaAvisou = await db.get(`work_notified_${userId}`);
          if (!jaAvisou) {
            await db.set(`work_notified_${userId}`, true);
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro na verificação de notificações:', err);
  }
}, 60000);
