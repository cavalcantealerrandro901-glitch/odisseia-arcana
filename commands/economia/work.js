const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
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

const COOLDOWN_TEMPO = 30 * 60 * 1000; // 30 Minutos em ms

module.exports = {
  name: 'work',
  aliases: ['trabalhar', 'job', 'trampo'],
  description: 'Trabalhe para ganhar almas e evoluir no Rank Divino (Cooldown: 30 min)',
  slashData: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabalhe para ganhar almas e evoluir no Rank Divino'),

  async execute(message, args, client) {
    return processarTrabalho(message, message.author, false);
  },

  async executeSlash(interaction, client) {
    return processarTrabalho(interaction, interaction.user, true);
  }
};

async function processarTrabalho(contexto, usuario, isSlash = false) {
  const userId = usuario.id;
  const agora = Date.now();

  const ultimoWork = (await db.get(`work_cooldown_${userId}`)) || 0;
  const tempoPassado = agora - ultimoWork;

  // Botão de Lembrete
  const botaoLembrete = new ButtonBuilder()
    .setCustomId(`lembrete_work_${userId}`)
    .setLabel('🔔 Me avise no PV quando puder trabalhar')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(botaoLembrete);

  // Verificação de Cooldown (Ainda não passaram 30 minutos)
  if (tempoPassado < COOLDOWN_TEMPO) {
    const restante = COOLDOWN_TEMPO - tempoPassado;
    const minutos = Math.floor(restante / (1000 * 60));
    const segundos = Math.floor((restante % (1000 * 60)) / 1000);

    const embedCooldown = new EmbedBuilder()
      .setTitle('⏳ Você já trabalhou recentemente!')
      .setDescription(`Você está cansado. Aguarde **${minutos}m ${segundos}s** para poder trabalhar novamente.`)
      .setColor('#FF0000')
      .setFooter({ text: 'Dica: Clique no botão abaixo para receber um aviso no PV quando o tempo acabar!' })
      .setTimestamp();

    const respostaCooldown = isSlash 
      ? await contexto.reply({ embeds: [embedCooldown], components: [row], fetchReply: true })
      : await contexto.reply({ embeds: [embedCooldown], components: [row] });

    tratarColetorLembrete(respostaCooldown, usuario, restante);
    return;
  }

  // Processamento do Trabalho
  let rankIndex = (await db.get(`work_rank_${userId}`)) || 0;
  let workCount = (await db.get(`work_count_${userId}`)) || 0;
  let carteira = (await db.get(`carteira_${userId}`)) || 0;

  const multiplicador = rankIndex + 1;
  const baseGanha = Math.floor(Math.random() * 150) + 100; // Gera entre 100 e 250
  const valorTotal = baseGanha * multiplicador;

  workCount += 1;
  
  // Progressão do Rank Divino
  let subiuRank = false;
  const trabalhosNecessarios = (rankIndex + 1) * 5;
  if (workCount >= trabalhosNecessarios && rankIndex < CARGOS_DIVINOS.length - 1) {
    rankIndex += 1;
    workCount = 0;
    subiuRank = true;
  }

  // Atualização no banco de dados
  await db.set(`carteira_${userId}`, carteira + valorTotal);
  await db.set(`work_cooldown_${userId}`, agora);
  await db.set(`work_rank_${userId}`, rankIndex);
  await db.set(`work_count_${userId}`, workCount);

  const nomeRank = CARGOS_DIVINOS[rankIndex];

  const frasesTrabalho = [
    'Você purificou almas perdidas no abismo de Aeternus.',
    'Você forjou artefatos místico-divinos para os deuses.',
    'Você colheu essências estelares nos campos celestiais.',
    'Você protegeu os portões celestes contra invasores sombrios.',
    'Você transmutou poeira cósmica em almas puras.'
  ];
  const fraseSorteada = frasesTrabalho[Math.floor(Math.random() * frasesTrabalho.length)];

  const embedSucesso = new EmbedBuilder()
    .setTitle('🛠️ Trabalho Concluído!')
    .setAuthor({ name: usuario.globalName || usuario.username, iconURL: usuario.displayAvatarURL() })
    .setDescription(
      `*${fraseSorteada}*\n\n` +
      `💰 **Almas Ganhas:** \`+${valorTotal.toLocaleString('pt-BR')}\` *(Base: ${baseGanha} x Mult: ${multiplicador})*\n` +
      `👛 **Novo Saldo em Mãos:** \`${(carteira + valorTotal).toLocaleString('pt-BR')}\` almas\n` +
      `👑 **Rank Divino Atual:** **${nomeRank}**` +
      (subiuRank ? `\n\n🎉 **PARABÉNS!** Você evoluiu para o Rank **${nomeRank}**! Seu multiplicador agora é **x${rankIndex + 1}**!` : '')
    )
    .setColor('#00FFA3')
    .setFooter({ text: 'Próximo trabalho em 30 minutos. Clique abaixo se quiser ser avisado!' })
    .setTimestamp();

  const respostaSucesso = isSlash
    ? await contexto.reply({ embeds: [embedSucesso], components: [row], fetchReply: true })
    : await contexto.reply({ embeds: [embedSucesso], components: [row] });

  tratarColetorLembrete(respostaSucesso, usuario, COOLDOWN_TEMPO);
}

function tratarColetorLembrete(mensagemResposta, usuarioOriginal, tempoEspera) {
  const collector = mensagemResposta.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000 // O botão fica interativo na mensagem por 2 minutos
  });

  collector.on('collect', async interaction => {
    if (interaction.user.id !== usuarioOriginal.id) {
      return interaction.reply({ content: '❌ Apenas quem usou o comando pode ativar este lembrete!', ephemeral: true });
    }

    const minutosFaltantes = Math.ceil(tempoEspera / (1000 * 60));

    await interaction.reply({ 
      content: `🔔 **Lembrete ativado com sucesso!** Eu vou te mandar uma mensagem privada no PV assim que seu trabalho estiver liberado (em aprox. **${minutosFaltantes} min**).`, 
      ephemeral: true 
    });

    // Desativa e altera o botão após o clique
    const botaoAgendado = new ButtonBuilder()
      .setCustomId('lembrete_concluido')
      .setLabel('✅ Lembrete Agendado no PV')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true);

    await interaction.message.edit({ components: [new ActionRowBuilder().addComponents(botaoAgendado)] }).catch(() => {});

    // Agenda o envio da notificação no PV
    setTimeout(async () => {
      try {
        const embedAviso = new EmbedBuilder()
          .setTitle('⏰ Hora de Trabalhar!')
          .setDescription('Já se passaram **30 minutos**! Seu cooldown terminou e você já pode usar `O.work` ou `/work` novamente para coletar mais almas.')
          .setColor('#00FFA3')
          .setTimestamp();

        await usuarioOriginal.send({ embeds: [embedAviso] });
      } catch (err) {
        // Ignora caso as DMs do usuário estejam bloqueadas
      }
    }, tempoEspera);
  });
}
