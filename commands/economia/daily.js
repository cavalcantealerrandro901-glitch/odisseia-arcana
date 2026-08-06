const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

const TEMPO_COOLDOWN = 24 * 60 * 60 * 1000; // 24h

module.exports = {
  name: 'daily',
  aliases: ['diario', 'resgatar'],
  description: 'Resgate sua recompensa diária de moedas',
  slashData: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Resgate sua recompensa diária de moedas'),

  async execute(message, args, client) {
    return processarDaily(message, message.author);
  },

  async executeSlash(interaction, client) {
    return processarDaily(interaction, interaction.user, true);
  }
};

async function processarDaily(contexto, autor, isSlash = false) {
  const chaveCooldown = `daily_cooldown_${autor.id}`;
  const chaveCarteira = `carteira_${autor.id}`;
  const chaveBanco = `banco_${autor.id}`;

  const ultimoResgate = (await db.get(chaveCooldown)) || 0;
  const agora = Date.now();

  if (agora - ultimoResgate < TEMPO_COOLDOWN) {
    const tempoRestante = TEMPO_COOLDOWN - (agora - ultimoResgate);
    const horas = Math.floor(tempoRestante / (1000 * 60 * 60));
    const minutos = Math.floor((tempoRestante % (1000 * 60 * 60)) / (1000 * 60));

    const msg = `⏳ Você já resgatou sua recompensa hoje! Volte em **${horas}h ${minutos}m**.`;
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const recompensa = Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
  
  const saldoCarteira = (await db.get(chaveCarteira)) || 0;
  const saldoBanco = (await db.get(chaveBanco)) || 0;

  const novaCarteira = saldoCarteira + recompensa;
  const novoTotal = novaCarteira + saldoBanco;

  await db.set(chaveCarteira, novaCarteira);
  await db.set(chaveCooldown, agora);

  const embed = new EmbedBuilder()
    .setTitle('🎁 Recompensa Diária!')
    .setColor('#f1c40f')
    .setDescription(`Você resgatou suas moedas diárias e recebeu **+${recompensa.toLocaleString()}** 🪙!`)
    .addFields(
      { name: '👛 Carteira', value: `\`${novaCarteira.toLocaleString()}\` 🪙`, inline: true },
      { name: '🏦 Banco', value: `\`${saldoBanco.toLocaleString()}\` 🪙`, inline: true },
      { name: '💎 Total', value: `\`${novoTotal.toLocaleString()}\` 🪙`, inline: false }
    )
    .setFooter({ text: `Aeternus Economia • ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
