const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { getGif } = require('./gifs');

/**
 * Gerencia as interações e deforma uma cadeia de respostas marcando mensagens anteriores
 */
async function executarInteracao({ contexto, autor, alvo, client, endpoint, nomeAcao, emoji, cor, isSlash }) {
  if (isSlash) await contexto.deferReply();

  const gifInicial = getGif(endpoint);
  const embedInicial = new EmbedBuilder()
    .setDescription(`${emoji} **${autor.username}** deu ${nomeAcao} **${alvo.username}**!`)
    .setColor(cor)
    .setTimestamp();

  if (gifInicial) embedInicial.setImage(gifInicial);

  // 🤖 CENÁRIO 1: Ação feita contra o próprio BOT (Aeternos)
  if (alvo.id === client.user.id) {
    const payloadInicial = {
      content: `<@${autor.id}> <@${client.user.id}>`,
      embeds: [embedInicial]
    };

    const mensagemInicial = isSlash 
      ? await contexto.editReply(payloadInicial)
      : await contexto.reply(payloadInicial);

    // O Bot devolve em 1.5s marcando a mensagem original enviada
    setTimeout(async () => {
      const gifDevolucao = getGif(endpoint);
      const embedDevolucao = new EmbedBuilder()
        .setDescription(`🤖⚡ **${client.user.username}** não deixou barato e devolveu ${nomeAcao} **${autor.username}**!`)
        .setColor('#E74C3C')
        .setTimestamp();

      if (gifDevolucao) embedDevolucao.setImage(gifDevolucao);

      await contexto.channel.send({
        content: `<@${autor.id}>`,
        embeds: [embedDevolucao],
        reply: { messageReference: mensagemInicial.id } // Marca a mensagem anterior!
      }).catch(() => {});
    }, 1500);

    return;
  }

  // 👥 CENÁRIO 2: Interação entre Usuários (Cadeia de devoluções marcando a mensagem antiga)
  const button = new ButtonBuilder()
    .setCustomId('devolver_acao')
    .setLabel('Devolver 🔄')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  const payloadInicial = {
    content: `<@${autor.id}> <@${alvo.id}>`,
    embeds: [embedInicial],
    components: [row]
  };

  const mensagemInicial = isSlash 
    ? await contexto.editReply(payloadInicial)
    : await contexto.reply(payloadInicial);

  // Inicia o loop de devolucao
  criarColetorDevolucao(mensagemInicial, autor, alvo, endpoint, nomeAcao, emoji, cor);
}

function criarColetorDevolucao(mensagemAlvo, autorAtual, alvoAtual, endpoint, nomeAcao, emoji, cor) {
  const collector = mensagemAlvo.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 360000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== alvoAtual.id) {
      return i.reply({ content: '❌ Apenas quem recebeu a ação pode devolver!', flags: [MessageFlags.Ephemeral] });
    }

    // 1. Marca o botão da mensagem anterior como desativado
    const buttonDesativado = new ButtonBuilder()
      .setCustomId('devolver_acao_done')
      .setLabel('Devolvido! 🔄')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    await i.update({ components: [new ActionRowBuilder().addComponents(buttonDesativado)] }).catch(() => {});

    // 2. Prepara o novo embed e botão para a réplica
    const novoGif = getGif(endpoint);
    const novoEmbed = new EmbedBuilder()
      .setDescription(`${emoji} **${alvoAtual.username}** devolveu ${nomeAcao} **${autorAtual.username}**!`)
      .setColor(cor)
      .setTimestamp();

    if (novoGif) novoEmbed.setImage(novoGif);

    const novoBotao = new ButtonBuilder()
      .setCustomId('devolver_acao')
      .setLabel('Devolver 🔄')
      .setStyle(ButtonStyle.Primary);

    const novaRow = new ActionRowBuilder().addComponents(novoBotao);

    // 3. Envia a NOVA mensagem RESPONDENDO/MARCANDO a mensagem antiga
    const novaMensagem = await i.channel.send({
      content: `<@${alvoAtual.id}> <@${autorAtual.id}>`,
      embeds: [novoEmbed],
      components: [novaRow],
      reply: { messageReference: mensagemAlvo.id } // <--- Responde diretamente a mensagem anterior
    });

    // 4. Continua a corrente (inverte o alvo com o autor na nova mensagem)
    criarColetorDevolucao(novaMensagem, alvoAtual, autorAtual, endpoint, nomeAcao, emoji, cor);
  });

  collector.on('end', (collected, reason) => {
    if (reason !== 'messageDelete') {
      const buttonExpirado = new ButtonBuilder()
        .setCustomId('devolver_acao_exp')
        .setLabel('Devolver 🔄')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      mensagemAlvo.edit({ components: [new ActionRowBuilder().addComponents(buttonExpirado)] }).catch(() => {});
    }
  });
}

module.exports = { executarInteracao };
