const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/warns.json' });

module.exports = {
  name: 'warns',
  aliases: ['avisos', 'advertencias'],
  description: 'Consulta a quantidade de advertências de um membro',
  slashData: new SlashCommandBuilder()
    .setName('warns')
    .setDescription('Consulta a quantidade de advertências de um membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro a consultar os avisos')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    const target = message.mentions.users.first() || message.author;
    const chave = `warns_${message.guild.id}_${target.id}`;
    const avisos = (await db.get(chave)) || 0;

    const embed = new EmbedBuilder()
      .setTitle(`📋 Advertências — ${target.username}`)
      .setColor('#3498db')
      .setDescription(`O membro possui **${avisos}** advertência(s) neste servidor.`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const chave = `warns_${interaction.guild.id}_${target.id}`;
    const avisos = (await db.get(chave)) || 0;

    const embed = new EmbedBuilder()
      .setTitle(`📋 Advertências — ${target.username}`)
      .setColor('#3498db')
      .setDescription(`O membro possui **${avisos}** advertência(s) neste servidor.`)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
