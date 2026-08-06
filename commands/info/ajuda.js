const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType,
  SlashCommandBuilder 
} = require('discord.js');

// Dados do Painel de Ajuda do Aeternus
const CATEGORIAS = {
  inicio: {
    title: '🌌 Aeternus — Painel Principal',
    description: `Olá! Eu sou o **Aeternus**, seu bot completo de **Apostas, Jogos, Moderação e Diversão**!\n\n` +
      `📌 **Prefixos suportados:** \`O.\` ou \`o.\` (Também aceito comandos Slash \`/\`)\n\n` +
      `💡 *Selecione uma categoria no menu abaixo para ver os comandos disponíveis, ou use \`O.ajuda <categoria>\`!*`,
    color: '#5865F2'
  },
  economia: {
    title: '💰 Categorias: Economia & Apostas',
    fields: [
      { name: '`O.atm` | `/ver-saldo`', value: 'Consulta seu saldo de Almas/Moedas.' },
      { name: '`O.bal`', value: 'Verifica a carteira e o banco via prefixo.' }
    ],
    color: '#2ecc71'
  },
  jogos: {
    title: '🎲 Categorias: Jogos & Diversão',
    fields: [
      { name: '`Em breve...`', value: 'Novos jogos estão sendo desenvolvidos!' }
    ],
    color: '#f1c40f'
  },
  moderacao: {
    title: '🛡️ Categorias: Moderação',
    fields: [
      { name: '`Em breve...`', value: 'Comandos de moderação em breve!' }
    ],
    color: '#e74c3c'
  },
  info: {
    title: '📊 Categorias: Informações',
    fields: [
      { name: '`O.ping`', value: 'Mede a latência do bot.' },
      { name: '`O.ajuda`', value: 'Abre este painel interativo.' }
    ],
    color: '#3498db'
  }
};

module.exports = {
  name: 'ajuda',
  aliases: ['help'],
  description: 'Exibe a central de ajuda do Aeternus',
  slashData: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe a central de ajuda do Aeternus')
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Categoria específica para consultar')
        .setRequired(false)
        .addChoices(
          { name: 'Economia', value: 'economia' },
          { name: 'Jogos', value: 'jogos' },
          { name: 'Moderação', value: 'moderacao' },
          { name: 'Informações', value: 'info' }
        )
    ),

  // Execução via Prefixo
  async execute(message, args, client) {
    const categoriaArgumento = args[0] ? args[0].toLowerCase() : null;

    // Se passou argumento direto (ex: O.ajuda economia)
    if (categoriaArgumento && CATEGORIAS[categoriaArgumento] && categoriaArgumento !== 'inicio') {
      const embed = construirEmbedCategoria(categoriaArgumento, message.author);
      return message.reply({ embeds: [embed] });
    }

    // Caso contrário, manda o menu interativo
    return enviarPainelInterativo(message, message.author);
  },

  // Execução via Slash Command
  async executeSlash(interaction, client) {
    const categoriaArgumento = interaction.options.getString('categoria');

    if (categoriaArgumento && CATEGORIAS[categoriaArgumento]) {
      const embed = construirEmbedCategoria(categoriaArgumento, interaction.user);
      return interaction.reply({ embeds: [embed] });
    }

    return enviarPainelInterativo(interaction, interaction.user, true);
  }
};

// Função para construir o Embed de uma Categoria
function construirEmbedCategoria(chave, autor) {
  const dados = CATEGORIAS[chave];
  const embed = new EmbedBuilder()
    .setTitle(dados.title)
    .setColor(dados.color)
    .setFooter({ text: `Aeternus Bot • Solicitado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (dados.description) embed.setDescription(dados.description);
  if (dados.fields) embed.addFields(dados.fields);

  return embed;
}

// Função para enviar e tratar a interatividade do SelectMenu
async function enviarPainelInterativo(contexto, autor, isSlash = false) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_ajuda_aeternus')
    .setPlaceholder('📂 Escolha uma categoria...')
    .addOptions([
      { label: 'Início / Apresentação', value: 'inicio', emoji: '🌌', description: 'Apresentação do Aeternus e prefixos' },
      { label: 'Economia & Apostas', value: 'economia', emoji: '💰', description: 'Comandos de saldos, jogos de azar e trocas' },
      { label: 'Jogos & Diversão', value: 'jogos', emoji: '🎲', description: 'Comandos interativos e minigames' },
      { label: 'Moderação', value: 'moderacao', emoji: '🛡️', description: 'Ferramentas de gestão do servidor' },
      { label: 'Informações', value: 'info', emoji: '📊', description: 'Status do bot e dados gerais' }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  const initialEmbed = construirEmbedCategoria('inicio', autor);

  const response = isSlash
    ? await contexto.reply({ embeds: [initialEmbed], components: [row], fetchReply: true })
    : await contexto.reply({ embeds: [initialEmbed], components: [row] });

  // Coletor para interações com o menu
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000 // 60 segundos ativo
  });

  collector.on('collect', async (interaction) => {
    // Garante que apenas quem usou o comando pode interagir
    if (interaction.user.id !== autor.id) {
      return interaction.reply({ content: '❌ Apenas quem solicitou o comando pode usar este menu.', ephemeral: true });
    }

    const valorSelecionado = interaction.values[0];
    const novoEmbed = construirEmbedCategoria(valorSelecionado, autor);

    await interaction.update({ embeds: [novoEmbed] });
  });

  collector.on('end', () => {
    // Desativa o menu após o tempo esgotar
    selectMenu.setDisabled(true);
    const disabledRow = new ActionRowBuilder().addComponents(selectMenu);
    response.edit({ components: [disabledRow] }).catch(() => {});
  });
}
