const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'carteira',
  aliases: ['wallet', 'pobreza'],
  description: 'Exibe apenas o saldo de almas na carteira do usuário',
  slashData: new SlashCommandBuilder()
    .setName('carteira')
    .setDescription('Exibe o saldo de almas na carteira')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Selecione o usuário para consultar')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    let targetUser = message.mentions.users.first() || message.author;
    return exibirCarteira(message, targetUser, false);
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    return exibirCarteira(interaction, targetUser, true);
  }
};

async function exibirCarteira(contexto, targetUser, isSlash = false) {
  const carteira = (await db.get(`carteira_${targetUser.id}`)) || 0;
  const autor = isSlash ? contexto.user : contexto.author;

  const embed = new EmbedBuilder()
    .setAuthor({ 
      name: `Carteira — ${targetUser.globalName || targetUser.username}`, 
      iconURL: targetUser.displayAvatarURL() 
    })
    .setColor('#00FFA3')
    .setDescription(`👛 **Saldo em Mãos:** \`${carteira.toLocaleString('pt-BR')}\` almas`)
    .setFooter({ 
      text: `Solicitado por ${autor.username}`, 
      iconURL: autor.displayAvatarURL() 
    })
    .setTimestamp();

  return contexto.reply({ embeds: [embed] });
}
