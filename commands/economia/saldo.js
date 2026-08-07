const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

module.exports = {
  name: 'saldo',
  aliases: ['atm', 'bal', 'balance', 'carteira', 'banco', 'money', 'patrimonio'],
  description: 'Exibe o patrimônio total do usuário',
  slashData: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Exibe o patrimônio total do usuário')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Membro para visualizar o patrimônio')
        .setRequired(false)
    ),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first() || message.author;
    return mostrarPatrimonio(message, target, false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    return mostrarPatrimonio(interaction, target, true);
  }
};

async function mostrarPatrimonio(contexto, alvo, isSlash = false) {
  const guildId = isSlash ? contexto.guildId : contexto.guild.id;
  const autor = isSlash ? contexto.user : contexto.author;

  let perfil = await User.findOne({ userId: alvo.id, guildId });
  if (!perfil) {
    perfil = await User.create({ userId: alvo.id, guildId });
  }

  const carteira = perfil.carteira || 0;
  const banco = perfil.banco || 0;
  const patrimonioTotal = carteira + banco;

  const embed = new EmbedBuilder()
    .setTitle(`💎 Patrimônio de ${alvo.username}`)
    .setThumbnail(alvo.displayAvatarURL({ dynamic: true }))
    .setColor('#2ECC71')
    .addFields(
      { name: '💎 Patrimônio', value: `\`R$ ${patrimonioTotal.toLocaleString('pt-BR')}\``, inline: false }
    )
    .setFooter({ text: `Solicitado por ${autor.username}` })
    .setTimestamp();

  return isSlash ? contexto.reply({ embeds: [embed] }) : contexto.reply({ embeds: [embed] });
}
