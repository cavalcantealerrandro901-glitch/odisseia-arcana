const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'verdivida',
  aliases: ['divida', 'debt'],
  description: 'Consulta o valor atual da sua dívida bancária',
  slashData: new SlashCommandBuilder()
    .setName('verdivida')
    .setDescription('Consulta a sua dívida bancária atual')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Selecione o usuário para consultar')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    let targetUser = message.mentions.users.first() || message.author;
    return exibirDivida(message, targetUser, false);
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    return exibirDivida(interaction, targetUser, true);
  }
};

async function exibirDivida(contexto, targetUser, isSlash = false) {
  const divida = (await db.get(`divida_${targetUser.id}`)) || 0;

  const embed = new EmbedBuilder()
    .setAuthor({ name: `Consulta de Dívida — ${targetUser.globalName || targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
    .setColor(divida > 0 ? '#FF0000' : '#00FFA3')
    .setDescription(
      divida > 0 
        ? `⚠️ **Dívida Ativa:** \`${divida.toLocaleString('pt-BR')}\` almas\n\nQuite-a usando o comando \`O.pagardivida\` ou pelo painel do \`O.banco\`.`
        : '✅ **Nenhuma dívida cadastrada!** Sua reputação no Banco Celestial está limpa.'
    )
    .setTimestamp();

  return contexto.reply({ embeds: [embed] });
}
