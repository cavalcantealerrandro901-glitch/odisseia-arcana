const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe a central de ajuda e os comandos do bot.')
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Categoria específica que deseja visualizar')
        .setRequired(false)),
  name: 'ajuda',
  category: 'Ajuda',
  aliases: ['help', 'comandos', 'cmds'],
  description: 'Exibe a central de ajuda interativa do bot.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;
    const prefix = '!'; // Prefixo padrão (pode ser ajustado se tiver sistema de prefixo por servidor)

    // Agrupar comandos dinamicamente
    const categories = {};
    
    client.commands.forEach(cmd => {
      // Se o comando não tiver categoria definida, jogamos para 'Geral' ou 'Utilidades'
      const cat = cmd.category || 'Geral';
      if (!categories[cat]) {
        categories[cat] = [];
      }
      // Evitar duplicatas de aliases no painel
      if (!categories[cat].includes(cmd.name)) {
        categories[cat].push(cmd.name);
      }
    });

    const categoryNames = Object.keys(categories);

    // Verificar se o usuário passou uma categoria por argumento (ex: !ajuda economia)
    let requestedCategory = null;
    if (isSlash) {
      requestedCategory = ctx.options.getString('categoria');
    } else if (args[0]) {
      requestedCategory = args[0].toLowerCase();
    }

    // Se o usuário pediu uma categoria específica
    if (requestedCategory) {
      const foundCategory = categoryNames.find(c => c.toLowerCase() === requestedCategory);
      if (!foundCategory) {
        return ctx.reply(`❌ Categoria **\`${requestedCategory}\`** não encontrada! Use \`${prefix}ajuda\` para ver as disponíveis.`);
      }

      const embedCat = new EmbedBuilder()
        .setTitle(`📂 Categoria: ${foundCategory}`)
        .setColor(0x9b59b6)
        .setDescription(`Lista de comandos disponíveis nesta categoria:\n\n` + 
          categories[foundCategory].map(cmdName => `• \`${prefix}${cmdName}\``).join('\n'))
        .setFooter({ text: `Odisseia Arcana • Total: ${categories[foundCategory].length} comandos` })
        .setTimestamp();

      return ctx.reply({ embeds: [embedCat] });
    }

    // Mensagem principal do Painel de Ajuda com Menu
    const mainEmbed = new EmbedBuilder()
      .setTitle('✨ Odisseia Arcana — Central de Ajuda')
      .setColor(0x5865F2)
      .setDescription(
        `Seja bem-vindo(a) à **Odisseia Arcana**, aventureiro(a)! 🗡️🔮\n\n` +
        `Este bot foi feito para gerenciar sua jornada, economia de almas, níveis, sistemas sociais e muito mais.\n\n` +
        `📌 **Prefixo atual neste servidor:** \`${prefix}\`\n` +
        `💡 *Dica: Você pode usar comandos por barra (Slash Commands) digitando \`/\` ou por prefixo (\`${prefix}\`).*\n\n` +
        `👇 **Selecione uma categoria abaixo** no menu interativo para explorar os comandos:`
      )
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Solicitado por ${author.username}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    // Criar o menu de seleção com as categorias encontradas
    const selectOptions = categoryNames.map(cat => ({
      label: cat,
      description: `Ver comandos da categoria ${cat}`,
      value: `help_${cat}`,
      emoji: getCategoryEmoji(cat)
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📂 Escolha uma categoria...')
        .addOptions(selectOptions)
    );

    const msg = await ctx.reply({
      embeds: [mainEmbed],
      components: [row],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000 // 2 minutos
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({
          content: '❌ Apenas quem executou o comando pode usar este menu!',
          ephemeral: true
        });
      }

      const selectedValue = interaction.values[0];
      const selectedCategory = selectedValue.replace('help_', '');
      const cmdsList = categories[selectedCategory] || [];

      const categoryEmbed = new EmbedBuilder()
        .setTitle(`📂 Categoria: ${selectedCategory}`)
        .setColor(0x9b59b6)
        .setDescription(`Comandos disponíveis em **${selectedCategory}**:\n\n` + 
          cmdsList.map(cmdName => `• \`${prefix}${cmdName}\``).join('\n'))
        .setFooter({ text: `Odisseia Arcana • Página interativa` })
        .setTimestamp();

      await interaction.update({
        embeds: [categoryEmbed],
        components: [row]
      });
    });

    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('help_menu_disabled')
            .setPlaceholder('⏰ Menu expirado')
            .addOptions([{ label: 'Expirado', value: 'expired', description: 'O tempo deste menu expirou.' }])
            .setDisabled(true)
        );
        await msg.edit({ components: [disabledRow] });
      } catch (e) {}
    });
  }
};

// Função auxiliar para colocar emojis bonitinhos nas categorias
function getCategoryEmoji(category) {
  const cat = category.toLowerCase();
  if (cat.includes('economia') || cat.includes('almas')) return '🔮';
  if (cat.includes('perfil') || cat.includes('usuario')) return '👤';
  if (cat.includes('diversao') || cat.includes('jogo')) return '🎮';
  if (cat.includes('moderacao') || cat.includes('admin')) return '🛡️';
  if (cat.includes('xp') || cat.includes('nivel')) return '⭐';
  return '📁';
}
