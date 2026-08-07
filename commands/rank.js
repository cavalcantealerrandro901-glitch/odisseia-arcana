const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Exibe os rankings do servidor e globais.')
    .addSubcommand(sub =>
      sub
        .setName('almas')
        .setDescription('Ranking global de Almas.'))
    .addSubcommand(sub =>
      sub
        .setName('local')
        .setDescription('Ranking de Almas deste servidor.'))
    .addSubcommand(sub =>
      sub
        .setName('xp')
        .setDescription('Ranking de Experiência (XP).')),
  name: 'rank',
  category: 'Economia e Ranks',
  aliases: ['top', 'leaderboard', 'lb'],
  description: 'Exibe os rankings de almas (global/local) e XP em Embed com páginas.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    let type = 'almas';

    if (isSlash) {
      type = ctx.options.getSubcommand();
    } else {
      const sub = args[0] ? args[0].toLowerCase() : 'almas';
      if (['almas', 'global'].includes(sub)) type = 'almas';
      else if (['local', 'server', 'servidor'].includes(sub)) type = 'local';
      else if (['xp', 'level', 'nivel'].includes(sub)) type = 'xp';
    }

    const UserModel = mongoose.models.User || mongoose.model('User');
    let rawList = [];

    if (type === 'almas') {
      rawList = await UserModel.find({ souls: { $gt: 0 } }).sort({ souls: -1 }).lean();
    } else if (type === 'local') {
      const allSoulsUsers = await UserModel.find({ souls: { $gt: 0 } }).sort({ souls: -1 }).lean();
      if (guild) {
        await guild.members.fetch().catch(() => {});
        rawList = allSoulsUsers.filter(u => guild.members.cache.has(u.userId));
      } else {
        rawList = allSoulsUsers;
      }
    } else if (type === 'xp') {
      rawList = await UserModel.find({ xp: { $gt: 0 } }).sort({ level: -1, xp: -1 }).lean();
    }

    if (!rawList || rawList.length === 0) {
      return ctx.reply('⚠️ Nenhum usuário encontrado no ranking ainda!');
    }

    const pageSize = 10;
    const totalPages = Math.ceil(rawList.length / pageSize);
    let currentPage = 0;

    const getRankSymbol = (index) => {
      switch (index) {
        case 0: return '🥇 **[1º]**';
        case 1: return '🥈 **[2º]**';
        case 2: return '🥉 **[3º]**';
        case 3: return '🏅 **[4º]**';
        case 4: return '🏅 **[5º]**';
        default: return `\`#${index + 1}\``;
      }
    };

    const buildEmbed = (page) => {
      const start = page * pageSize;
      const currentChunk = rawList.slice(start, start + pageSize);

      let title = '🏆 Ranking Global de Almas';
      let color = 0x9b59b6; // Roxo

      if (type === 'local') {
        title = `🏆 Ranking de Almas — ${guild ? guild.name : 'Servidor'}`;
        color = 0x3498db; // Azul
      } else if (type === 'xp') {
        title = '⭐ Ranking de Experiência (XP)';
        color = 0xf1c40f; // Dourado
      }

      let description = `Membros com as maiores pontuações:\n\n`;

      currentChunk.forEach((data, i) => {
        const globalIndex = start + i;
        const symbol = getRankSymbol(globalIndex);
        const isTop5 = globalIndex < 5;

        let valStr = '';
        if (type === 'xp') {
          valStr = `Nível **${data.level || 1}** • **${(data.xp || 0).toLocaleString()} XP**`;
        } else {
          valStr = `🔮 **${(data.souls || 0).toLocaleString()} almas**`;
        }

        if (isTop5) {
          description += `${symbol} <@${data.userId}>\n└ 👑 ${valStr}\n\n`;
        } else {
          description += `${symbol} <@${data.userId}> — ${valStr}\n`;
        }
      });

      return new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setDescription(description)
        .setFooter({ 
          text: `Página ${page + 1} de ${totalPages} • Total: ${rawList.length} usuários`,
          iconURL: author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
    };

    const buildButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rank_prev')
          .setLabel('◀️ Voltar')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('rank_next')
          .setLabel('Próximo ▶️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages - 1)
      );
    };

    const msg = await ctx.reply({
      embeds: [buildEmbed(currentPage)],
      components: [buildButtons(currentPage)],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000 
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({
          content: '❌ Apenas quem usou o comando pode navegar nas páginas!',
          ephemeral: true
        });
      }

      if (interaction.customId === 'rank_prev' && currentPage > 0) {
        currentPage--;
      } else if (interaction.customId === 'rank_next' && currentPage < totalPages - 1) {
        currentPage++;
      }

      await interaction.update({
        embeds: [buildEmbed(currentPage)],
        components: [buildButtons(currentPage)]
      });
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rank_prev')
          .setLabel('◀️ Voltar')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('rank_next')
          .setLabel('Próximo ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      try {
        await msg.edit({ components: [disabledRow] });
      } catch (e) {}
    });
  }
};
