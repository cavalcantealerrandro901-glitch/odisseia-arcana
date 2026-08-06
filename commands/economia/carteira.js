const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'carteira',
  aliases: ['wallet'],
  description: 'Consulta exclusivamente o saldo disponível na carteira',
  slashData: new SlashCommandBuilder()
    .setName('carteira')
    .setDescription('Consulta o saldo na carteira de um membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro para consultar a carteira')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    let target = message.mentions.users.first();
    if (!target && args[0]) {
      target = await client.users.fetch(args[0]).catch(() => null);
    }
    if (!target) target = message.author;

    return exibirCarteira(message, target);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    return exibirCarteira(interaction, target, true);
  }
};

async function exibirCarteira(contexto, target, isSlash = false) {
  const carteira = (await db.get(`carteira_${target.id}`)) || 0;

  const embed = new EmbedBuilder()
    .setTitle(`👛 Carteira — ${target.username}`)
    .setColor('#e67e22')
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .setDescription(`Dinheiro na carteira: **\`${carteira.toLocaleString('pt-BR')}\` 🪙**`)
    .setFooter({ text: 'Aeternus Economia • Use O.deposit para proteger no banco' })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
