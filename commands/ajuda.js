const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Mostra a central de ajuda interativa do Aeternos.')
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Escolha uma categoria para ver os comandos dela diretamente')
        .setRequired(false)
    ),
  name: 'ajuda',
  aliases: ['help'],
  category: 'Utilidade',
  description: 'Exibe a central de ajuda do bot.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;
    const prefix = process.env.PREFIX_BOT || '!';

    // Agrupar comandos por categoria dinamicamente
    const categories = {};
    client.commands.forEach(cmd => {
      const cat = cmd.category || 'Geral';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd);
    });

    // Se o usuário passou uma categoria por argumento no prefixo (!ajuda economia) ou via Slash (/ajuda categoria:economia)
    const selectedCategory = isSlash ? ctx.options.getString('categoria') : args[0];

    if (selectedCategory) {
      const foundCategory = Object.keys(categories).find(c => c.toLowerCase() === selectedCategory.toLowerCase());
      if (foundCategory) {
        const embed = new EmbedBuilder()
          .setTitle(`📂 Categoria: ${foundCategory}`)
          .setDescription(`Aqui estão todos os comandos disponíveis na categoria **${foundCategory}** do Aeternos:`)
          .setColor(0x9b59b6)
          .setTimestamp();

        categories[foundCategory].forEach(cmd => {
          embed.addFields({
            name: `🔹 \`${prefix}${cmd.name}\` (ou \`/${cmd.name}\`)`,
            value: cmd.description || 'Sem descrição.',
            inline: false
          });
        });

        return ctx.reply({ embeds: [embed], ephemeral: true });
      } else {
        return ctx.reply({ content: `❌ A categoria \`${selectedCategory}\` não foi encontrada. Use o comando de ajuda sem argumentos para ver as opções.`, ephemeral: true });
      }
    }

    // Apresentação graciosa e central de ajuda principal
    const mainEmbed = new EmbedBuilder()
      .setTitle('✨ Bem-vindo(a) à Central do Aeternos ✨')
      .setDescription(
        `Olá, **${author.username}**! É uma honra ter você por aqui.\n\n` +
        `Eu sou o **Aeternos**, seu guardião digital e assistente multifuncional, projetado para trazer magia, organização e diversão para o seu servidor.\n\n` +
        `⚙️ **Configurações Atuais neste Servidor:**\n` +
        `• **Prefixo por texto:** \`${prefix}\` (Ex: \`${prefix}ajuda\`, \`${prefix}daily\`, etc.)\n` +
        `• **Comandos por Barra (Slash):** \`/ajuda\`, \`/ping\`, etc.\n\n` +
        `💡 **Como explorar:**\n` +
        `Você pode usar \`${prefix}ajuda <categoria>\` para visualizar comandos específicos ou utilizar o menu interativo logo abaixo para selecionar a categoria desejada de forma prática e elegante.`
      )
      .setColor(0x9b59b6)
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Aeternos • Seu universo digital sob controle.` })
      .setTimestamp();

    // Criar o menu de seleção dinâmico com as categorias (máximo de 25 opções pelo Discord)
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category_menu')
      .setPlaceholder('📂 Selecione uma categoria de comandos...');

    Object.keys(categories).forEach(cat => {
      selectMenu.addOptions({
        label: cat,
        description: `Visualizar comandos da categoria ${cat}`,
        value: cat,
      });
    });

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await ctx.reply({ embeds: [mainEmbed], components: [row], fetchReply: true });

    // Coletor de interações para o menu de seleção
    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === author.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'help_category_menu') {
        const chosenCat = i.values[0];
        const cmds = categories[chosenCat];

        const catEmbed = new EmbedBuilder()
          .setTitle(`📂 Categoria: ${chosenCat}`)
          .setDescription(`Lista completa de comandos cadastrados sob a categoria **${chosenCat}**:`)
          .setColor(0x3498db)
          .setTimestamp();

        cmds.forEach(cmd => {
          catEmbed.addFields({
            name: `🔹 \`${prefix}${cmd.name}\` / \`/${cmd.name}\``,
            value: cmd.description || 'Sem descrição informada.',
            inline: false
          });
        });

        await i.update({ embeds: [catEmbed], components: [row] });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        selectMenu.setDisabled(true)
      );
      response.edit({ components: [disabledRow] }).catch(() => {});
    });
  }
};
