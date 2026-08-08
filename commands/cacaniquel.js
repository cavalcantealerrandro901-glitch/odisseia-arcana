const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const emojis = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎'];

function getRandomEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('caca-niquel')
    .setDescription('Joga no caça-níquel virtual com suas moedas.')
    .addIntegerOption(opt =>
      opt.setName('aposta')
        .setDescription('Quantidade de moedas que deseja apostar')
        .setRequired(true)
        .setMinValue(1)),
  name: 'caca-niquel',
  aliases: ['slots', 'cacaniquel'],
  category: 'Economia',
  description: 'Joga no caça-níquel com moedas virtuais.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;

    let aposta = 10;
    if (isSlash) {
      aposta = ctx.options.getInteger('aposta');
    } else if (args[0] && !isNaN(args[0])) {
      aposta = parseInt(args[0]);
    }

    if (aposta <= 0) {
      return ctx.reply({ content: '❌ A aposta precisa ser maior que zero!', ephemeral: true });
    }

    // Gerar os 3 rolos do caça-níquel
    const r1 = getRandomEmoji();
    const r2 = getRandomEmoji();
    const r3 = getRandomEmoji();

    let multiplicador = 0;
    let resultadoTitulo = '❌ Você Perdeu!';
    let cor = 0xe74c3c;

    // Lógica de premiação
    if (r1 === r2 && r2 === r3) {
      if (r1 === '💎') {
        multiplicador = 10; // Jackpot de Diamante
        resultadoTitulo = '💎 JACKPOT MÁXIMO! 💎';
        cor = 0xf1c40f;
      } else if (r1 === '🔔') {
        multiplicador = 5;
        resultadoTitulo = '🔔 Grande Vitória! 🔔';
        cor = 0x2ecc71;
      } else {
        multiplicador = 3;
        resultadoTitulo = '🎉 Três Iguais! 🎉';
        cor = 0x2ecc71;
      }
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      multiplicador = 1.5; // Dois iguais recuperam um pouco ou dão lucro leve
      resultadoTitulo = '✨ Dois Iguais! ✨';
      cor = 0x3498db;
    }

    const ganho = Math.floor(aposta * multiplicador);
    const lucro = ganho - aposta;

    const embed = new EmbedBuilder()
      .setTitle('🎰 Caça-Níquel Odisseia Arcana')
      .setColor(cor)
      .setDescription(`[ ${r1} | ${r2} | ${r3} ]\n\n**${resultadoTitulo}**`)
      .addFields(
        { name: 'Aposta', value: `🪙 ${aposta} moedas`, inline: true },
        { name: 'Retorno', value: `🪙 ${ganho} moedas`, inline: true },
        { name: 'Lucro/Prejuízo', value: `${lucro >= 0 ? '+' : ''}${lucro} moedas`, inline: true }
      )
      .setFooter({ text: `Jogador: ${author.username}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
