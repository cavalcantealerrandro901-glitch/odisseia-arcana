const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

const TEMPO_COOLDOWN = 60 * 60 * 1000; // Cooldown de 1 hora

module.exports = {
  name: 'rob',
  aliases: ['roubar', 'assaltar'],
  description: 'Tenta roubar moedas da carteira de outro membro (Risco de multa)',
  slashData: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Tenta roubar moedas da carteira de outro membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro alvo do assalto')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❓ Mencione o membro que deseja tentar assaltar.');
    return processarRoubo(message, target, message.author);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    return processarRoubo(interaction, target, interaction.user, true);
  }
};

async function processarRoubo(contexto, target, autor, isSlash = false) {
  if (target.id === autor.id) {
    const msg = '❌ Você não pode tentar assaltar a si mesmo!';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  if (target.bot) {
    const msg = '❌ Você não pode assaltar bots!';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const chaveCooldown = `rob_cooldown_${autor.id}`;
  const ultimoRoubo = (await db.get(chaveCooldown)) || 0;
  const agora = Date.now();

  if (agora - ultimoRoubo < TEMPO_COOLDOWN) {
    const tempoRestante = TEMPO_COOLDOWN - (agora - ultimoRoubo);
    const minutos = Math.floor(tempoRestante / (1000 * 60));

    const msg = `⏳ Você precisa esperar **${minutos} minuto(s)** para tentar outro assalto.`;
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const carteiraAlvo = (await db.get(`carteira_${target.id}`)) || 0;
  const carteiraAutor = (await db.get(`carteira_${autor.id}`)) || 0;

  if (carteiraAlvo < 100) {
    const msg = `❌ O membro ${target} tem menos de 100 🪙 na carteira! Não vale a pena o risco. *(Lembrando: moedas guardadas no banco estão 100% protegidas!)*`;
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  // 50% de chance de sucesso
  const sucesso = Math.random() < 0.5;
  await db.set(chaveCooldown, agora);

  if (sucesso) {
    // Rouba entre 20% e 50% do dinheiro da carteira do alvo
    const porcentagem = Math.random() * (0.5 - 0.2) + 0.2;
    const quantiaRoubada = Math.floor(carteiraAlvo * porcentagem);

    await db.set(`carteira_${target.id}`, carteiraAlvo - quantiaRoubada);
    await db.set(`carteira_${autor.id}`, carteiraAutor + quantiaRoubada);

    const embed = new EmbedBuilder()
      .setTitle('🥷 Assalto Bem-Sucedido!')
      .setColor('#2ecc71')
      .setDescription(`Você conseguiu roubar **${quantiaRoubada.toLocaleString()}** 🪙 da carteira de ${target}!`)
      .setFooter({ text: 'Dica: Guarde suas moedas no banco com O.deposit para não ser roubado!' })
      .setTimestamp();

    return isSlash ? contexto.reply({ embeds: [embed] }) : contexto.reply({ embeds: [embed] });
  } else {
    // Falha: Paga uma multa de até 300 moedas para a vítima
    const multa = Math.min(carteiraAutor, 300);
    
    if (multa > 0) {
      await db.set(`carteira_${autor.id}`, carteiraAutor - multa);
      await db.set(`carteira_${target.id}`, carteiraAlvo + multa);
    }

    const embed = new EmbedBuilder()
      .setTitle('🚨 Assalto Fracassou!')
      .setColor('#e74c3c')
      .setDescription(`Você foi pego em flagrante tentando assaltar ${target} e teve que pagar uma multa de **${multa.toLocaleString()}** 🪙 para a vítima!`)
      .setTimestamp();

    return isSlash ? contexto.reply({ embeds: [embed] }) : contexto.reply({ embeds: [embed] });
  }
}
