const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

module.exports = {
  name: 'saldo',
  aliases: ['carteira', 'banco', 'bal', 'money'],
  description: 'Veja o seu saldo ou o de outro membro',
  slashData: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Veja o seu saldo ou o de outro membro')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Membro para ver o saldo')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    const target = message.mentions.users.first() || message.author;
    return mostrarSaldo(message, target, false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    return mostrarSaldo(interaction, target, true);
  }
};

async function mostrarSaldo(contexto, alvo, isSlash = false) {
  const guildId = isSlash ? contexto.guildId : contexto.guild.id;

  let perfil = await User.findOne({ userId: alvo.id, guildId });
  if (!perfil) perfil = await User.create({ userId: alvo.id, guildId });

  const total = perfil.carteira + perfil.banco;

  const embed = new EmbedBuilder()
    .setTitle(`💰 Saldo de ${alvo.username}`)
    .setThumbnail(alvo.displayAvatarURL({ dynamic: true }))
    .setColor('#00FF7F')
    .addFields(
      { name: '💵 Carteira', value: `\`R$ ${perfil.carteira.toLocaleString('pt-BR')}\``, inline: true },
      { name: '🏦 Banco', value: `\`R$ ${perfil.banco.toLocaleString('pt-BR')}\``, inline: true },
      { name: '💎 Total', value: `\`R$ ${total.toLocaleString('pt-BR')}\``, inline: false }
    )
    .setTimestamp();

  return isSlash ? contexto.reply({ embeds: [embed] }) : contexto.reply({ embeds: [embed] });
}
