const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../../models/User');

function parseAmount(str) {
  if (!str) return null;
  const match = str.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmbt]?)$/);
  if (!match) return null;

  let value = parseFloat(match[1]);
  const multiplier = match[2];

  switch (multiplier) {
    case 'k': value *= 1e3; break;
    case 'm': value *= 1e6; break;
    case 'b': value *= 1e9; break;
    case 't': value *= 1e12; break;
  }

  return Math.floor(value);
}

module.exports = {
  name: 'pagar',
  aliases: ['pay', 'pix', 'pagardivida'],
  description: 'Paga ou transfere valor/almas para outro usuário',
  slashData: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Paga ou transfere valor/almas para outro usuário')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuário a ser pago')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('valor')
        .setDescription('Valor a pagar (ex: 90, 1k, 1.5m, 2b)')
        .setRequired(true)
    ),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply(`❌ Mencione para quem deseja pagar! Ex: \`${prefix}pagar @membro 90\``);
    }

    const inputValor = args[1];
    const valor = parseAmount(inputValor);

    if (!valor || valor <= 0) {
      return message.reply('❌ Digite um valor válido para o pagamento (ex: 90, 1k, 1.5m).');
    }

    return processarPagamento(message, message.author, target, valor, false);
  },

  async executeSlash(interaction, client) {
    // EVITA O ERRO 10062: Defere a resposta IMEDIATAMENTE antes de consultar o banco
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const target = interaction.options.getUser('usuario');
    const inputValor = interaction.options.getString('valor');
    const valor = parseAmount(inputValor);

    if (!valor || valor <= 0) {
      return interaction.editReply({ content: '❌ Digite um valor válido para o pagamento (ex: 90, 1k, 1.5m).' });
    }

    return processarPagamento(interaction, interaction.user, target, valor, true);
  }
};

async function processarPagamento(contexto, pagador, recebedor, valor, isSlash) {
  if (pagador.id === recebedor.id) {
    const msg = '❌ Você não pode pagar a si mesmo!';
    return isSlash ? contexto.editReply({ content: msg }) : contexto.reply(msg);
  }

  try {
    const pagadorData = await User.findOne({ userId: pagador.id });
    const saldoAtual = pagadorData?.money || 0;

    if (saldoAtual < valor) {
      const msg = `❌ Saldo insuficiente! Você possui **💰 ${saldoAtual.toLocaleString('pt-BR')}** e precisa de **💰 ${valor.toLocaleString('pt-BR')}**.`;
      return isSlash ? contexto.editReply({ content: msg }) : contexto.reply(msg);
    }

    // Atualiza os saldos no banco de dados
    await User.findOneAndUpdate(
      { userId: pagador.id },
      { $inc: { money: -valor } },
      { upsert: true }
    );

    await User.findOneAndUpdate(
      { userId: recebedor.id },
      { $inc: { money: valor } },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('💳 Pagamento Realizado!')
      .setDescription(`💸 Valor pago: \`${valor.toLocaleString('pt-BR')}\` almas\n🎉 **Pagamento concluído para <@${recebedor.id}>!**`)
      .setTimestamp();

    const payload = { embeds: [embed] };
    return isSlash ? contexto.editReply(payload) : contexto.reply(payload);

  } catch (error) {
    console.error('Erro no processamento do pagamento:', error);
    const errorMsg = '❌ Ocorreu um erro ao processar o pagamento no banco de dados.';
    return isSlash ? contexto.editReply({ content: errorMsg }) : contexto.reply(errorMsg);
  }
}
