const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

module.exports = {
  name: 'saldo',
  aliases: ['atm', 'bal', 'balance', 'carteira', 'banco', 'money', 'patrimonio'],
  description: 'Exibe o saldo total do usuário',
  slashData: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Exibe o saldo total do usuário')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Membro para visualizar o saldo')
        .setRequired(false)
    ),

  async execute(message, args, client, prefix) {
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
  const autor = isSlash ? contexto.user : contexto.author;

  let perfil = await User.findOne({ userId: alvo.id, guildId });
  if (!perfil) {
    perfil = await User.create({ userId: alvo.id, guildId });
  }

  const carteira = perfil.carteira || 0;
  const banco = perfil.banco || 0;
  const saldoTotal = carteira + banco;

  const embed = new EmbedBuilder()
    .setTitle(`💰 Saldo de ${alvo.username}`)
    .setThumbnail(alvo.displayAvatarURL({ dynamic: true }))
    .setColor('#2ECC71')
    .addFields(
      { name: '💵 Saldo', value: `\`R$ ${saldoTotal.toLocaleString('pt-BR')}\``, inline: false }
    )
    .setFooter({ text: `Solicitado por ${autor.username}` })
    .setTimestamp();

  return isSlash ? contexto.reply({ embeds: [embed] }) : contexto.reply({ embeds: [embed] });
}
