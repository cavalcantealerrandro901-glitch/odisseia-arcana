const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'deposit',
  aliases: ['dep', 'depositar'],
  description: 'Deposita moedas da carteira no seu banco',
  slashData: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposita moedas da carteira no banco')
    .addStringOption(option =>
      option.setName('quantia')
        .setDescription('Quantia para depositar ou "all" para tudo')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    const quantiaInput = args[0];
    if (!quantiaInput) return message.reply('❓ Informe a quantia que deseja depositar ou use `all` para depositar tudo.');
    return processarDeposito(message, quantiaInput, message.author);
  },

  async executeSlash(interaction, client) {
    const quantiaInput = interaction.options.getString('quantia');
    return processarDeposito(interaction, quantiaInput, interaction.user, true);
  }
};

async function processarDeposito(contexto, quantiaInput, autor, isSlash = false) {
  const chaveCarteira = `carteira_${autor.id}`;
  const chaveBanco = `banco_${autor.id}`;

  const saldoCarteira = (await db.get(chaveCarteira)) || 0;
  const saldoBanco = (await db.get(chaveBanco)) || 0;

  if (saldoCarteira <= 0) {
    const msg = '❌ Você não tem nenhuma moeda na carteira para depositar!';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  let valorDepositar = 0;
  if (quantiaInput.toLowerCase() === 'all' || quantiaInput.toLowerCase() === 'tudo') {
    valorDepositar = saldoCarteira;
  } else {
    valorDepositar = parseInt(quantiaInput);
  }

  if (isNaN(valorDepositar) || valorDepositar <= 0) {
    const msg = '❓ Por favor, especifique uma quantia válida ou `all`.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  if (valorDepositar > saldoCarteira) {
    const msg = `❌ Você só possui **${saldoCarteira.toLocaleString()}** moedas na carteira.`;
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  await db.set(chaveCarteira, saldoCarteira - valorDepositar);
  await db.set(chaveBanco, saldoBanco + valorDepositar);

  const embed = new EmbedBuilder()
    .setTitle('🏦 Depósito Realizado!')
    .setColor('#2ecc71')
    .setDescription(`Você depositou **${valorDepositar.toLocaleString()}** 🪙 no banco com sucesso!`)
    .addFields(
      { name: '👛 Carteira', value: `\`${(saldoCarteira - valorDepositar).toLocaleString()}\` 🪙`, inline: true },
      { name: '🏦 Banco', value: `\`${(saldoBanco + valorDepositar).toLocaleString()}\` 🪙`, inline: true }
    )
    .setFooter({ text: `Aeternus Economia • ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
