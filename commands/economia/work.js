const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

const TEMPO_COOLDOWN = 2 * 60 * 60 * 1000; // 2 horas de espera

const TRABALHOS = [
  'Trabalhou como caçador de recompensas',
  'Ajudou na limpeza da taverna local',
  'Programou um novo bot para o Discord',
  'Efetivou trocas comerciais no mercado central',
  'Trabalhou como guarda da cidade durante a noite'
];

module.exports = {
  name: 'work',
  aliases: ['trabalhar'],
  description: 'Trabalhe para ganhar moedas a cada 2 horas',
  slashData: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabalhe para ganhar moedas a cada 2 horas'),

  async execute(message, args, client) {
    return processarWork(message, message.author);
  },

  async executeSlash(interaction, client) {
    return processarWork(interaction, interaction.user, true);
  }
};

async function processarWork(contexto, autor, isSlash = false) {
  const chaveCooldown = `work_cooldown_${autor.id}`;
  const chaveSaldo = `carteira_${autor.id}`;

  const ultimoTrabalho = (await db.get(chaveCooldown)) || 0;
  const agora = Date.now();

  if (agora - ultimoTrabalho < TEMPO_COOLDOWN) {
    const tempoRestante = TEMPO_COOLDOWN - (agora - ultimoTrabalho);
    const minutos = Math.floor(tempoRestante / (1000 * 60));

    const msg = `⏳ Você está cansado! Descanse mais **${minutos} minutos** antes de trabalhar novamente.`;
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const ganho = Math.floor(Math.random() * (400 - 150 + 1)) + 150;
  const saldoAtual = (await db.get(chaveSaldo)) || 0;
  const trabalhoRealizado = TRABALHOS[Math.floor(Math.random() * TRABALHOS.length)];

  await db.set(chaveSaldo, saldoAtual + ganho);
  await db.set(chaveCooldown, agora);

  const embed = new EmbedBuilder()
    .setTitle('💼 Hora do Trabalho!')
    .setColor('#3498db')
    .setDescription(`${trabalhoRealizado} e recebeu **${ganho.toLocaleString()}** 🪙!\n\n**Saldo na Carteira:** \`${(saldoAtual + ganho).toLocaleString()}\` 🪙`)
    .setFooter({ text: `Aeternus Economia • ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
