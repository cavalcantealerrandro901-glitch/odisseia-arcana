const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'pay',
  aliases: ['pagar', 'transferir'],
  description: 'Transfere uma quantia de moedas da sua carteira para outro membro',
  slashData: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfere moedas para outro membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro que receberá as moedas')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantia')
        .setDescription('Quantidade de moedas a transferir')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(message, args, client) {
    const target = message.mentions.users.first();
    const quantia = parseInt(args[1]);

    if (!target) return message.reply('❓ Mencione o membro para quem deseja transferir.');
    if (!quantia || isNaN(quantia) || quantia <= 0) return message.reply('❓ Informe uma quantia válida para transferir.');

    return processarPagamento(message, target, quantia, message.author);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    const quantia = interaction.options.getInteger('quantia');

    return processarPagamento(interaction, target, quantia, interaction.user, true);
  }
};

async function processarPagamento(contexto, destino, quantia, autor, isSlash = false) {
  if (destino.id === autor.id) {
    const msg = '❌ Você não pode transferir moedas para si mesmo.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  if (destino.bot) {
    const msg = '❌ Você não pode transferir moedas para bots.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const chaveAutor = `carteira_${autor.id}`;
  const chaveDestino = `carteira_${destino.id}`;

  const saldoAutor = (await db.get(chaveAutor)) || 0;

  if (saldoAutor < quantia) {
    const msg = `❌ Você não possui **${quantia.toLocaleString()}** moedas na sua carteira para realizar esta transferência! (Saldo atual: \`${saldoAutor.toLocaleString()}\`)`;
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const saldoDestino = (await db.get(chaveDestino)) || 0;

  await db.set(chaveAutor, saldoAutor - quantia);
  await db.set(chaveDestino, saldoDestino + quantia);

  const embed = new EmbedBuilder()
    .setTitle('💸 Transferência Realizada!')
    .setColor('#2ecc71')
    .setDescription(`Você transferiu **${quantia.toLocaleString()}** 🪙 para ${destino}.\n\n**Seu saldo atual:** \`${(saldoAutor - quantia).toLocaleString()}\` 🪙`)
    .setFooter({ text: `Aeternus Economia • ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
