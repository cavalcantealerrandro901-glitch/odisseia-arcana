const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'balance',
  aliases: ['bal', 'saldo', 'carteira', 'atm'],
  description: 'Consulta o saldo da carteira, banco e total de um membro',
  slashData: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Consulta o saldo de um membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro para consultar o saldo')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    // Tenta pegar por menção, por ID ou usa quem enviou a mensagem
    let target = message.mentions.users.first();
    if (!target && args[0]) {
      target = await client.users.fetch(args[0]).catch(() => null);
    }
    if (!target) target = message.author;

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
      { name: '👛 Carteira', value: `\`${carteira.toLocaleString('pt-BR')}\` 🪙`, inline: true },
      { name: '🏦 Banco', value: `\`${banco.toLocaleString('pt-BR')}\` 🪙`, inline: true },
      { name: '💎 Total Geral', value: `\`${total.toLocaleString('pt-BR')}\` 🪙`, inline: false }
    )
    .setFooter({ text: 'Aeternus Economia' })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
