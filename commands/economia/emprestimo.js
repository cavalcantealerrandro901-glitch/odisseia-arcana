const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'emprestimo',
  aliases: ['pediremprestimo', 'loan'],
  description: 'Solicita um empréstimo ao Banco Celestial (Máx: 100.000 almas)',
  slashData: new SlashCommandBuilder()
    .setName('emprestimo')
    .setDescription('Solicita um empréstimo ao Banco Celestial')
    .addIntegerOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade de almas a solicitar')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100000)
    ),

  async execute(message, args, client) {
    const quantia = parseInt(args[0]);
    if (isNaN(quantia) || quantia <= 0) {
      return message.reply('⚠️ Informe um valor válido para o empréstimo! Exemplo: `O.emprestimo 5000`');
    }
    return processarEmprestimo(message, message.author, quantia, false);
  },

  async executeSlash(interaction, client) {
    const quantia = interaction.options.getInteger('quantidade');
    return processarEmprestimo(interaction, interaction.user, quantia, true);
  }
};

async function processarEmprestimo(contexto, usuario, quantia, isSlash = false) {
  const userId = usuario.id;
  const dividaAtual = (await db.get(`divida_${userId}`)) || 0;

  if (dividaAtual > 0) {
    const msg = `❌ **Empréstimo Recusado!** Você já possui uma dívida pendente de \`${dividaAtual.toLocaleString('pt-BR')}\` almas. Quite-a antes de solicitar mais almas.`;
    return isSlash ? contexto.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : contexto.reply(msg);
  }

  if (quantia > 100000) {
    const msg = '❌ O limite máximo por empréstimo é de **100.000 almas**!';
    return isSlash ? contexto.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : contexto.reply(msg);
  }

  const juros = Math.floor(quantia * 0.10); // 10%
  const dividaTotal = quantia + juros;
  const carteira = (await db.get(`carteira_${userId}`)) || 0;

  await db.set(`carteira_${userId}`, carteira + quantia);
  await db.set(`divida_${userId}`, dividaTotal);

  const embed = new EmbedBuilder()
    .setTitle('💰 Empréstimo Aprovado!')
    .setAuthor({ name: usuario.globalName || usuario.username, iconURL: usuario.displayAvatarURL() })
    .setColor('#00FFA3')
    .setDescription(
      `💸 **Valor Recebido:** \`+${quantia.toLocaleString('pt-BR')}\` almas em mãos\n` +
      `⚠️ **Dívida Gerada (10% juros):** \`${dividaTotal.toLocaleString('pt-BR')}\` almas\n\n` +
      `Use \`O.pagardivida\` ou o botão no \`O.banco\` para quitar quando puder.`
    )
    .setTimestamp();

  return contexto.reply({ embeds: [embed] });
}
