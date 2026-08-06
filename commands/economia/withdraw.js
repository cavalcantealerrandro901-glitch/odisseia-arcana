const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'withdraw',
  aliases: ['sacar', 'with'],
  description: 'Saca moedas do banco para sua carteira',
  slashData: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Saca moedas do banco para a carteira')
    .addStringOption(option =>
      option.setName('quantia')
        .setDescription('Quantia para sacar ou "all" para tudo')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    const quantiaInput = args[0];
    if (!quantiaInput) return message.reply('❓ Informe a quantia que deseja sacar ou use `all` para sacar tudo.');
    return processarSaque(message, quantiaInput, message.author);
  },

  async executeSlash(interaction, client) {
    const quantiaInput = interaction.options.getString('quantia');
    return processarSaque(interaction, quantiaInput, interaction.user, true);
  }
};

async function processarSaque(contexto, quantiaInput, autor, isSlash = false) {
  const chaveCarteira = `carteira_${autor.id}`;
  const chaveBanco = `banco_${autor.id}`;

  const saldoCarteira = (await db.get(chaveCarteira)) || 0;
  const saldoBanco = (await db.get(chaveBanco)) || 0;

  if (saldoBanco <= 0) {
    const msg = '❌ Você não tem nenhuma moeda no banco para sacar!';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  let valorSacar = 0;
  if (quantiaInput.toLowerCase() === 'all' || quantiaInput.toLowerCase() === 'tudo') {
    valorSacar = saldoBanco;
  } else {
    valorSacar = parseInt(quantiaInput);
  }

  if (isNaN(valorSacar) || valorSacar <= 0) {
    const msg = '❓ Por favor, especifique uma quantia válida ou `all`.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  if (valorSacar > saldoBanco) {
    const msg = `❌ Você só possui **${saldoBanco.toLocaleString()}** moedas no banco.`;
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  await db.set(chaveCarteira, saldoCarteira + valorSacar);
  await db.set(chaveBanco, saldoBanco - valorSacar);

  const embed = new EmbedBuilder()
    .setTitle('🏧 Saque Realizado!')
    .setColor('#e67e22')
    .setDescription(`Você sacou **${valorSacar.toLocaleString()}** 🪙 do banco!`)
    .addFields(
      { name: '👛 Carteira', value: `\`${(saldoCarteira + valorSacar).toLocaleString()}\` 🪙`, inline: true },
      { name: '🏦 Banco', value: `\`${(saldoBanco - valorSacar).toLocaleString()}\` 🪙`, inline: true }
    )
    .setFooter({ text: `Aeternus Economia • ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
