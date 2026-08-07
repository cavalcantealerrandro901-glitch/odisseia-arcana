const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'atm',
  aliases: ['caixa'],
  description: 'Exibe o saldo guardado no banco/caixa eletrônico do usuário',
  slashData: new SlashCommandBuilder()
    .setName('atm')
    .setDescription('Exibe o saldo de almas no banco (ATM)')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Selecione o usuário para consultar')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    let targetUser = message.mentions.users.first() || message.author;
    return exibirAtm(message, targetUser, false);
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    return exibirAtm(interaction, targetUser, true);
  }
};

async function exibirAtm(contexto, targetUser, isSlash = false) {
  const banco = (await db.get(`banco_${targetUser.id}`)) || 0;
  const autor = isSlash ? contexto.user : contexto.author;

  const embed = new EmbedBuilder()
    .setAuthor({ 
      name: `ATM / Banco — ${targetUser.globalName || targetUser.username}`, 
      iconURL: targetUser.displayAvatarURL() 
    })
    .setColor('#5865F2')
    .setDescription(`🏦 **Saldo no Banco (ATM):** \`${banco.toLocaleString('pt-BR')}\` almas`)
    .setFooter({ 
      text: `Solicitado por ${autor.username}`, 
      iconURL: autor.displayAvatarURL() 
    })
    .setTimestamp();

  return contexto.reply({ embeds: [embed] });
}
