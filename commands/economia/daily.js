const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  SlashCommandBuilder 
} = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

// GIF Épico Místico Giratório
const GIF_GIRATORIO = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc29lNXpnaGR5aG5xbTh6dWxqaWlhNG10ejdwaGVmcnk5dDF4OHo2ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3vR1v84n80dG/giphy.gif';

module.exports = {
  name: 'daily',
  aliases: ['diario', 'resgatar', 'recompensa'],
  description: 'Resgate a recompensa diária de moedas do Aeternus (Reset às 00:00)',
  slashData: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Resgate sua recompensa diária suprema de moedas'),

  async execute(message, args, client) {
    iniciarNotificadorProativo(client);
    return renderizarPainelDaily(message, message.author);
  },

  async executeSlash(interaction, client) {
    iniciarNotificadorProativo(client);
    return renderizarPainelDaily(interaction, interaction.user, true);
  }
};

// Obter data atual no fuso de Brasília (YYYY-MM-DD)
function getHojeData() {
  const agora = new Date();
  const opcoes = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' };
  const [dia, mes, ano] = agora.toLocaleDateString('pt-BR', opcoes).split('/');
  return `${ano}-${mes}-${dia}`;
}

// Obter data de ontem em Brasília
function getOntemData() {
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const opcoes = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' };
  const [dia, mes, ano] = ontem.toLocaleDateString('pt-BR', opcoes).split('/');
  return `${ano}-${mes}-${dia}`;
}

// Calcula tempo restante até a próxima meia-noite (00:00)
function getTempoAteMeiaNoite() {
  const agora = new Date();
  const meiaNoite = new Date(agora);
  meiaNoite.setHours(24, 0, 0, 0);

  const msRestantes = meiaNoite - agora;
  const horas = Math.floor(msRestantes / (1000 * 60 * 60));
  const minutos = Math.floor((msRestantes % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((msRestantes % (1000 * 60)) / 1000);

  return `${horas}h ${minutos}m ${segundos}s`;
}

async function renderizarPainelDaily(contexto, autor, isSlash = false) {
  const hoje = getHojeData();
  const ontem = getOntemData();

  const chaveLastClaim = `daily_last_date_${autor.id}`;
  const chaveStreak = `daily_streak_${autor.id}`;

  const ultimaData = await db.get(chaveLastClaim);
  let streakAtual = (await db.get(chaveStreak)) || 0;

  // Se já coletou hoje
  if (ultimaData === hoje) {
    const tempoFalta = getTempoAteMeiaNoite();

    const embedJaColetou = new EmbedBuilder()
      .setTitle('⚡ O PODER DIVINO ESTÁ SE RECARREGANDO! ⚡')
      .setColor('#9b59b6')
      .setThumbnail(autor.displayAvatarURL({ dynamic: true }))
      .setImage(GIF_GIRATORIO)
      .setDescription(
        `🏛️ **CALMA, MORTAL SUPREMO!**\n\n` +
        `Você já absorveu toda a energia cósmica disponível do **Aeternus** no dia de hoje.\n\n` +
        `🔥 **Sua Sequência Atual:** \`${streakAtual} dia(s) consecutivos\`\n` +
        `⏳ **Próximo Reset Divino:** \`${tempoFalta}\` *(Pontualmente às 00:00)*\n\n` +
        `*Nossos oráculos irão lhe notificar no PV assim que os portões celestiais se abrirem novamente!*`
      )
      .setFooter({ text: 'Aeternus Divindade • Meia-Noite o portal se renova' })
      .setTimestamp();

    return isSlash ? contexto.reply({ embeds: [embedJaColetou], ephemeral: true }) : contexto.reply({ embeds: [embedJaColetou] });
  }

  // Atualizar cálculo da sequência (Streak)
  if (ultimaData === ontem) {
    streakAtual += 1;
  } else if (ultimaData !== hoje) {
    streakAtual = 1; // Reseta a sequência se pulou algum dia
  }

  // Painel de Chamada para o Botão
  const embedInicial = new EmbedBuilder()
    .setTitle('🌌 RITUAL SAGRADO DO AETERNUS SUPREMO 🌌')
    .setColor('#f1c40f')
    .setThumbnail(autor.displayAvatarURL({ dynamic: true }))
    .setImage(GIF_GIRATORIO)
    .setDescription(
      `💥 **O COSMOS ESTÁ FERVILHANDO DE ENERGIA!** 💥\n\n` +
      `Uma tempestade de ouro e almas lendárias fendeu o firmamento. Chegou o momento de reivindicar seu poder diário!\n\n` +
      `🔥 **Sua Sequência Atual:** \`${streakAtual} dia(s) consecutivos\`\n` +
      `💎 **Estimativa da Fortuna:** \`5.000\` a \`60.000\` 🪙 *(Aumenta com seu Streak!)*\n\n` +
      `Clique no botão abaixo para canalizar o ritual e absorver a riqueza!`
    )
    .setFooter({ text: 'Você tem 60 segundos para apertar o botão.' })
    .setTimestamp();

  const botaoColetar = new ButtonBuilder()
    .setCustomId('coletar_daily')
    .setLabel('CLAMAR FORTUNA DIVINA!')
    .setStyle(ButtonStyle.Success)
    .setEmoji('👑');

  const row = new ActionRowBuilder().addComponents(botaoColetar);

  const mensagemResposta = isSlash
    ? await contexto.reply({ embeds: [embedInicial], components: [row], fetchReply: true })
    : await contexto.reply({ embeds: [embedInicial], components: [row] });

  const collector = mensagemResposta.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== autor.id) {
      return interaction.reply({ content: '❌ Apenas o dono deste ritual pode coletar a recompensa!', ephemeral: true });
    }

    // Cálculo do valor do Daily (de 5k até 60k dependendo do Streak)
    const baseMin = 5000;
    const baseMax = 15000;
    const sorteioBase = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
    
    // Bônus de Streak: +3.000 por dia continuo (Limitado ao teto absoluto de 60k)
    const bonusStreak = (streakAtual - 1) * 3000;
    const recompensaFinal = Math.min(60000, sorteioBase + bonusStreak);

    // Salvar no Banco de Dados
    const chaveCarteira = `carteira_${autor.id}`;
    const chaveBanco = `banco_${autor.id}`;
    
    const saldoCarteira = (await db.get(chaveCarteira)) || 0;
    const saldoBanco = (await db.get(chaveBanco)) || 0;
    const novaCarteira = saldoCarteira + recompensaFinal;
    const totalGeral = novaCarteira + saldoBanco;

    await db.set(chaveCarteira, novaCarteira);
    await db.set(chaveLastClaim, hoje);
    await db.set(chaveStreak, streakAtual);
    await db.set(`daily_notify_${autor.id}`, true); // Marca para notificar no PV à meia-noite

    botaoColetar.setDisabled(true);
    botaoColetar.setLabel('RECOMPENSA COLETADA COM SUCESSO!');
    const rowDesativada = new ActionRowBuilder().addComponents(botaoColetar);

    const embedSucesso = new EmbedBuilder()
      .setTitle('💥 RECOMPENSA DIVINA ABSURDA COLETADA! 💥')
      .setColor('#2ecc71')
      .setThumbnail(autor.displayAvatarURL({ dynamic: true }))
      .setImage(GIF_GIRATORIO)
      .setDescription(
        `🌌 **OS DEUSES CURVARAM-SE PERANTE SUA PRESENÇA!** 🌌\n\n` +
        `O fenda celestial se abriu e derramou uma fortuna lendária na sua conta!\n\n` +
        `🪙 **Moedas Absorvidas:** \`+${recompensaFinal.toLocaleString('pt-BR')}\` 🪙\n` +
        `🔥 **Nova Sequência:** \`${streakAtual} dia(s) seguidos\`\n\n` +
        `👛 **Carteira:** \`${novaCarteira.toLocaleString('pt-BR')}\` 🪙\n` +
        `💎 **Total Patrimônio:** \`${totalGeral.toLocaleString('pt-BR')}\` 🪙\n\n` +
        `⏰ *Volte amanhã à meia-noite para manter seu streak e alcançar os 60.000 de recompensa!*`
      )
      .setFooter({ text: 'Aeternus Economia Suprema' })
      .setTimestamp();

    await interaction.update({ embeds: [embedSucesso], components: [rowDesativada] });
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      botaoColetar.setDisabled(true);
      botaoColetar.setLabel('TEMPO DO RITUAL EXSPIRADO!');
      const rowDesativada = new ActionRowBuilder().addComponents(botaoColetar);

      const embedExpirado = new EmbedBuilder()
        .setTitle('⏱️ O Portal Se Fechou!')
        .setColor('#e74c3c')
        .setDescription('O tempo para responder ao ritual expirou. Digite o comando novamente para reabrir o portal!')
        .setTimestamp();

      mensagemResposta.edit({ embeds: [embedExpirado], components: [rowDesativada] }).catch(() => {});
    }
  });
}

// Loop de Verificação para Enviar Notificação no PV à Meia-Noite
let notificacaoAtiva = false;
function iniciarNotificadorProativo(client) {
  if (notificacaoAtiva) return;
  notificacaoAtiva = true;

  setInterval(async () => {
    const agora = new Date();
    const opcoes = { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false };
    const horaFormatada = agora.toLocaleTimeString('pt-BR', opcoes);

    // Se for 00:00 pontualmente no Fuso de Brasília
    if (horaFormatada === '00:00') {
      const todosOsDados = await db.all();
      const hoje = getHojeData();

      for (const item of todosOsDados) {
        if (item.key.startsWith('daily_notify_') && item.value === true) {
          const userId = item.key.replace('daily_notify_', '');
          const ultimaData = await db.get(`daily_last_date_${userId}`);

          if (ultimaData !== hoje) {
            try {
              const user = await client.users.fetch(userId).catch(() => null);
              if (user) {
                const embedPV = new EmbedBuilder()
                  .setTitle('🔔 SEU DAILY ESTÁ PRONTO NO AETERNUS!')
                  .setColor('#f1c40f')
                  .setImage(GIF_GIRATORIO)
                  .setDescription(
                    `✨ **A Meia-Noite chegou e os portões celestiais se renovaram!** ✨\n\n` +
                    `Seu daily de até **60.000 moedas** está disponível agora mesmo. Acesse o servidor e use \`O.daily\` ou \`/daily\` para garantir o seu bônus e não perder sua sequência!`
                  )
                  .setTimestamp();

                await user.send({ embeds: [embedPV] }).catch(() => {});
                await db.set(`daily_notify_${userId}`, false); // Desmarca até ele coletar de novo
              }
            } catch (err) {
              // PV fechado
            }
          }
        }
      }
    }
  }, 60000); // Roda a cada 1 minuto
}
