const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'atm',
  description: 'Consulta o saldo de Almas do usuário',
  // Estrutura para o Slash Command no Discord
  slashData: new SlashCommandBuilder()
    .setName('ver-saldo')
    .setDescription('Consulta o saldo de Almas de um usuário')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Usuário para ver o saldo')
        .setRequired(false)
    ),

  // Execução via Prefixo (O.atm)
  async execute(message, args, client) {
    const target = message.mentions.users.first() || message.author;
    const embed = await gerarEmbedSaldo(target, message.author);
    return message.reply({ embeds: [embed] });
  },

  // Execução via Slash Command (/ver-saldo)
  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const embed = await gerarEmbedSaldo(target, interaction.user);
    return interaction.reply({ embeds: [embed] });
  }
};

// Função auxiliar para gerar o Embed idêntico em ambos os casos
async function gerarEmbedSaldo(target, autor) {
  const almas = (await db.get(`almas_${target.id}`)) || 0;
  const banco = (await db.get(`banco_${target.id}`)) || 0;
  const total = almas + banco;

  return new EmbedBuilder()
    .setTitle(`✨ Carteira Arcana — ${target.username}`)
    .setColor('#2ecc71')
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👛 Carteira', value: `\`${almas.toLocaleString('pt-BR')}\` Almas`, inline: true },
      { name: '🏦 Banco', value: `\`${banco.toLocaleString('pt-BR')}\` Almas`, inline: true },
      { name: '💰 Total', value: `\`${total.toLocaleString('pt-BR')}\` Almas`, inline: false }
    )
    .setFooter({ 
      text: `Solicitado por ${autor.tag}`, 
      iconURL: autor.displayAvatarURL({ dynamic: true }) 
    })
    .setTimestamp();
}
