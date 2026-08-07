const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'saldo',
  aliases: ['bal', 'total', 'coins', 'almas'],
  description: 'Exibe o saldo total acumulado de almas (Carteira + Banco)',
  slashData: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Exibe o saldo total de almas de um usuário')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Selecione o usuário para consultar')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    let targetUser = message.mentions.users.first() || message.author;
    return exibirSaldoTotal(message, targetUser, false);
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    return exibirSaldoTotal(interaction, targetUser, true);
  }
};

async function exibirSaldoTotal(contexto, targetUser, isSlash = false) {
  const userId = targetUser.id;
  const carteira = (await db.get(`carteira_${userId}`)) || 0;
  const banco = (await db.get(`banco_${userId}`)) || 0;
  const total = carteira + banco;
  const autor = isSlash ? contexto.user : contexto.author;

  const embed = new EmbedBuilder()
    .setAuthor({ 
      name: `Saldo Total — ${targetUser.globalName || targetUser.username}`, 
      iconURL: targetUser.displayAvatarURL() 
    })
    .setColor('#FFD700')
    .setDescription(`🔮 **Patrimônio Total:** \`${total.toLocaleString('pt-BR')}\` almas`)
    .setFooter({ 
      text: `Solicitado por ${autor.username}`, 
      iconURL: autor.displayAvatarURL() 
    })
    .setTimestamp();

  return contexto.reply({ embeds: [embed] });
}
