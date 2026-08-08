const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe o painel de ajuda interativo do Aeternos.'),
  name: 'ajuda',
  aliases: ['help', 'comandos'],
  category: 'Utilidade',
  description: 'Painel de ajuda interativo do Aeternos.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const prefix = process.env.PREFIX_BOT || '!';

    // Agrupar comandos dinamicamente por categoria
    const categories = {};
    client.commands.forEach(cmd => {
      const cat = cmd.category || 'Geral';
      if (!categories[cat]) categories[cat] = [];
      if (!categories[cat].includes(cmd.data.name)) {
        categories[cat].push(cmd.data.name);
      }
    });

    // Embed de Apresentação do Aeternos
    const mainEmbed = new EmbedBuilder()
      .setTitle('✨ Olá, eu sou o Aeternos!')
      .setDescription(`Seu assistente virtual e bot oficial do servidor.\n\n**Como usar os comandos:**\n• **Slash Commands:** Digite \`/\` seguido do comando (ex: \`/ajuda\`).\n• **Prefixo:** Digite \`${prefix}\` antes do comando (ex: \`${prefix}ajuda\`).\n\nClique em uma das categorias abaixo para ver os comandos disponíveis!`)
      .setColor(0x7289da)
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Solicitado por ${author.username}`, iconURL: author.displayAvatarURL() })
      .setTimestamp();

    // Criar botões dinâmicos para cada categoria
    const row = new ActionRowBuilder();
    Object.keys(categories).forEach(cat => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`help_cat_${cat}`)
          .setLabel(cat)
          .setStyle(ButtonStyle.Primary)
      );
    });

    const response = await ctx.reply({ 
      embeds: [mainEmbed], 
      components: row.components.length > 0 ? [row] : [], 
      fetchReply: true 
    });

    // Coletor de interações dos botões (válido por 3 minutos)
    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === author.id,
      time: 180000
    });

    collector.on('collect', async i => {
      if (i.customId === 'help_home') {
        return await i.update({ embeds: [mainEmbed], components: [row] });
      }

      if (i.customId.startsWith('help_cat_')) {
        const selectedCategory = i.customId.replace('help_cat_', '');
        const cmds = categories[selectedCategory] || [];

        const catEmbed = new EmbedBuilder()
          .setTitle(`📁 Categoria: ${selectedCategory}`)
          .setDescription(cmds.length > 0 ? cmds.map(c => `• \`/${c}\` ou \`${prefix}${c}\``).join('\n') : 'Nenhum comando nesta categoria.')
          .setColor(0x2ecc71)
          .setFooter({ text: `Aeternos • Sistema de Ajuda` })
          .setTimestamp();

        const backRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('help_home')
            .setLabel('🏠 Início')
            .setStyle(ButtonStyle.Secondary)
        );

        await i.update({ embeds: [catEmbed], components: [row, backRow] });
      }
    });

    collector.on('end', () => {
      response.edit({ components: [] }).catch(() => {});
    });
  }
};
