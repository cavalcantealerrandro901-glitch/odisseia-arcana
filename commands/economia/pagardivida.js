const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'pagardivida',
  aliases: ['paydebt', 'quitar', 'pagardebito'],
  description: 'Paga total ou parcialmente a sua dívida bancária',
  slashData: new SlashCommandBuilder()
    .setName('pagardivida')
    .setDescription('Paga a sua dívida bancária com almas da carteira')
    .addStringOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade a pagar ou "tudo"')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    if (!args[0]) {
      return message.reply('⚠️ Informe a quantidade que deseja pagar ou `tudo`!\nExemplo: `O.pagardivida 5000` ou `O.pagardivida tudo`');
    }
    return processarPagamentoDivida(message, message.author, args[0], false);
  },

  async executeSlash(interaction, client) {
    const quantiaStr = interaction.options.getString('quantidade');
    return processarPagamentoDivida(interaction, interaction.user, quantiaStr, true);
  }
};

async function processarPagamentoDivida(contexto, usuario, quantiaStr, isSlash = false) {
  const userId = usuario.id;
  const dividaAtual = (await db.get(`divida_${userId}`)) || 0;

  if (dividaAtual === 0) {
    const msg = '✅ Você não possui nenhuma dívida ativa no momento!';
    return isSlash ? contexto.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : contexto.reply(msg);
  }

  const carteira = (await db.get(`carteira_${userId}`)) || 0;
  let valorPagamento = 0;

  if (quantiaStr.toLowerCase() === 'tudo' || quantiaStr.toLowerCase() === 'all') {
    valorPagamento = Math.min(carteira, dividaAtual);
  } else {
    valorPagamento = parseInt(quantiaStr);
  }

  if (isNaN(valorPagamento) || valorPagamento <= 0) {
    const msg = '❌ Insira um valor numérico válido ou `tudo` para pagar.';
    return isSlash ? contexto.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : contexto.reply(msg);
  }

  if (carteira < valorPagamento) {
    const msg = `❌ Saldo insuficiente na carteira! Você tem apenas \`${carteira.toLocaleString('pt-BR')}\` almas.`;
    return isSlash ? contexto.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : contexto.reply(msg);
  }

  const valorAbatido = Math.min(valorPagamento, dividaAtual);
  const novaDivida = dividaAtual - valorAbatido;

  await db.set(`carteira_${userId}`, carteira - valorAbatido);
  await db.set(`divida_${userId}`, novaDivida);

  const embed = new EmbedBuilder()
    .setTitle('💳 Pagamento de Dívida Realizado')
    .setAuthor({ name: usuario.globalName || usuario.username, iconURL: usuario.displayAvatarURL() })
    .setColor('#00FFA3')
    .setDescription(
      `💸 **Valor Pago:** \`${valorAbatido.toLocaleString('pt-BR')}\` almas\n` +
      `👛 **Carteira Restante:** \`${(carteira - valorAbatido).toLocaleString('pt-BR')}\` almas\n` +
      (novaDivida === 0 ? '🎉 **Sua dívida foi totalmente quitada!**' : `⚠️ **Dívida Restante:** \`${novaDivida.toLocaleString('pt-BR')}\` almas`)
    )
    .setTimestamp();

  return contexto.reply({ embeds: [embed] });
}
