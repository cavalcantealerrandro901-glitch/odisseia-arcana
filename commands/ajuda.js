const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Mostra a lista de todos os comandos disponíveis no bot.'),
  name: 'ajuda',
  aliases: ['help', 'comandos'],
  description: 'Mostra a lista de todos os comandos disponíveis no bot.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const prefix = ctx.prefix || '!';

    const embed = new EmbedBuilder()
      .setTitle('📜 Central de Ajuda — Comandos do Bot')
      .setColor('#5865F2')
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`Olá **${author.username}**! Confira abaixo todos os comandos disponíveis.\nVocê pode usar tanto por prefixo (\`${prefix}\`) quanto por **Slash Commands (/)**.\n\n---`)
      .addFields(
        { 
          name: '💰 Economia & Empregos', 
          value: 
            `• \`${prefix}work\` | \`/work\` — Trabalhe, ganhe salário e suba de cargo (7 níveis de XP).\n` +
            `• \`${prefix}daily\` | \`/daily\` — Resgate sua recompensa diária e mantenha sua sequência.\n` +
            `• \`${prefix}saldo\` | \`/saldo\` — Veja sua carteira, banco, dívida e patrimônio (ou de outro usuário).\n` +
            `• \`${prefix}banco\` | \`/banco\` — Abra o menu para depositar, sacar e pedir empréstimos.`
        },
        { 
          name: '⚙️ Utilidades & Geral', 
          value: 
            `• \`${prefix}afk\` | \`/afk\` — Fique ausente com um motivo opcional.\n` +
            `• \`${prefix}ajuda\` | \`/ajuda\` — Exibe este painel de ajuda.`
        }
      )
      .setFooter({ text: `Prefixo neste servidor: ${prefix} • Bot em operação` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
