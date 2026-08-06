const { EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'bal',
  aliases: ['saldo', 'almas', 'carteira'],
  description: 'Consulta o saldo de Almas via prefixo',
  async execute(message, args, client) {
    const target = message.mentions.users.first() || message.author;

    const almas = (await db.get(`almas_${target.id}`)) || 0;
    const banco = (await db.get(`banco_${target.id}`)) || 0;
    const total = almas + banco;

    const embed = new EmbedBuilder()
      .setTitle(`✨ Carteira Arcana — ${target.username}`)
      .setColor('#2ecc71')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👛 Carteira', value: `\`${almas.toLocaleString('pt-BR')}\` Almas`, inline: true },
        { name: '🏦 Banco', value: `\`${banco.toLocaleString('pt-BR')}\` Almas`, inline: true },
        { name: '💰 Total', value: `\`${total.toLocaleString('pt-BR')}\` Almas`, inline: false }
      )
      .setFooter({ 
        text: `Solicitado por ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
