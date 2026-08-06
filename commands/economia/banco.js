const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'banco',
  aliases: ['bank'],
  description: 'Consulta exclusivamente o saldo depositado no banco',
  slashData: new SlashCommandBuilder()
    .setName('banco')
    .setDescription('Consulta o saldo no banco de um membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro para consultar o saldo do banco')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    let target = message.mentions.users.first();
    if (!target && args[0]) {
      target = await client.users.fetch(args[0]).catch(() => null);
    }
    if (!target) target = message.author;

    return exibirBanco(message, target);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    return exibirBanco(interaction, target, true);
  }
};

async function exibirBanco(contexto, target, isSlash = false) {
  const banco = (await db.get(`banco_${target.id}`)) || 0;

  const embed = new EmbedBuilder()
    .setTitle(`🏦 Saldo do Banco — ${target.username}`)
    .setColor('#2ecc71')
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .setDescription(`Atualmente no banco: **\`${banco.toLocaleString('pt-BR')}\` 🪙**`)
    .setFooter({ text: 'Aeternus Economia • Dinheiro protegido contra roubos' })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
