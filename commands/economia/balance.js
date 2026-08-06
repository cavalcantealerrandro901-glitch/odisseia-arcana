const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'balance',
  aliases: ['bal', 'saldo', 'carteira'],
  description: 'Consulta o saldo da carteira, banco e o total de um membro',
  slashData: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Consulta o saldo de um membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro para consultar o saldo')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    const target = message.mentions.users.first() || message.author;
    return exibirSaldo(message, target);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    return exibirSaldo(interaction, target, true);
  }
};

async function exibirSaldo(contexto, target, isSlash = false) {
  const carteira = (await db.get(`carteira_${target.id}`)) || 0;
  const banco = (await db.get(`banco_${target.id}`)) || 0;
  const total = carteira + banco;

  const embed = new EmbedBuilder()
    .setTitle(`💰 Saldo de ${target.username}`)
    .setColor('#f1c40f')
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👛 Carteira', value: `\`${carteira.toLocaleString()}\` 🪙`, inline: true },
      { name: '🏦 Banco', value: `\`${banco.toLocaleString()}\` 🪙`, inline: true },
      { name: '💎 Total Geral', value: `\`${total.toLocaleString()}\` 🪙`, inline: false }
    )
    .setFooter({ text: 'Aeternus Economia' })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
