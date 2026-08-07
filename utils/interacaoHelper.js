const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { getGif } = require('./gifs');

/**
 * Gerencia todas as interações do bot (Tapa, Abraço, Soco, Carinho, Morder)
 */
async function executarInteracao({ contexto, autor, alvo, client, endpoint, nomeAcao, emoji, cor, isSlash }) {
  // 🤖 CENÁRIO 1: A ação foi feita contra o próprio BOT (Aeternos)
  if (alvo.id === client.user.id) {
    if (isSlash) await contexto.deferReply();

    const gifInicial = getGif(endpoint);
    const embedInicial = new EmbedBuilder()
      .setDescription(`${emoji} **${autor.username}** deu ${nomeAcao} **${client.user.username}**!`)
      .setColor(cor)
      .setTimestamp();

    if (gifInicial) embedInicial.setImage(gifInicial);

    const payloadInicial = {
      content: `<@${autor.id}> <@${client.user.id}>`,
      embeds: [embedInicial]
    };

    if (isSlash) {
      await contexto.editReply(payloadInicial);
    } else {
      await contexto.reply(payloadInicial);
    }

    // O Bot não deixa barato: Devolve a ação automaticamente em 1.5s
    setTimeout(async () => {
      const gifDevolucao = getGif(endpoint);
      const embedDevolucao = new EmbedBuilder()
        .setDescription(`🤖⚡ **${client.user.username}** não deixou barato e devolveu ${nomeAcao} **${autor.username}**!`)
        .setColor('#E74C3C')
        .setTimestamp();

      if (gifDevolucao) embedDevolucao.setImage(gifDevolucao);

      const payloadDevolucao = {
        content: `<@${autor.id}>`,
        embeds: [embedDevolucao]
      };

      if (isSlash) {
        await contexto.followUp(payloadDevolucao).catch(() => {});
      } else {
        await contexto.channel.send(payloadDevolucao).catch(() => {});
      }
    }, 1500);

    return;
  }

  // 👥 CENÁRIO 2: Interação normal entre dois usuários (com Botão Devolver)
  if (isSlash) await contexto.deferReply();

  let currentAuthor = autor;
  let currentTarget = alvo;

  const gif = getGif(endpoint);

  const button = new ButtonBuilder()
    .setCustomId('devolver_acao')
    .setLabel('Devolver 🔄')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  const embed = new EmbedBuilder()
    .setDescription(`${emoji} **${currentAuthor.username}** deu ${nomeAcao} **${currentTarget.username}**!`)
    .setColor(cor)
    .setTimestamp();

  if (gif) embed.setImage(gif);

  const payload = {
    content: `<@${currentAuthor.id}> <@${currentTarget.id}>`,
    embeds: [embed],
    components: [row]
  };

  const mensagem = isSlash ? await contexto.editReply(payload) : await contexto.reply(payload);

  const collector = mensagem.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 360000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== currentTarget.id) {
      return i.reply({ content: '❌ Apenas quem recebeu a ação pode devolver!', flags: [MessageFlags.Ephemeral] });
    }

    const temp = currentAuthor;
    currentAuthor = currentTarget;
    currentTarget = temp;

    const novoGif = getGif(endpoint);

    const novoEmbed = new EmbedBuilder()
      .setDescription(`${emoji} **${currentAuthor.username}** devolveu ${nomeAcao} **${currentTarget.username}**!`)
      .setColor(cor)
      .setTimestamp();

    if (novoGif) novoEmbed.setImage(novoGif);

    await i.update({
      content: `<@${currentAuthor.id}> <@${currentTarget.id}>`,
      embeds: [novoEmbed],
      components: [row]
    });
  });

  collector.on('end', () => {
    button.setDisabled(true);
    const disabledRow = new ActionRowBuilder().addComponents(button);
    mensagem.edit({ components: [disabledRow] }).catch(() => {});
  });
}

module.exports = { executarInteracao };
