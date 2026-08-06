const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType,
  SlashCommandBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Mapeamento de nomes bonitos e emojis para as pastas
const NOMES_CATEGORIAS = {
  economia: { nome: 'Economia & Apostas', emoji: '💰' },
  moderacao: { nome: 'Moderação', emoji: '🛡️' },
  jogos: { nome: 'Jogos & Diversão', emoji: '🎲' },
  info: { nome: 'Informações', emoji: '📊' }
};

module.exports = {
  name: 'ajuda',
  aliases: ['help'],
  description: 'Exibe a central de ajuda dinâmica do Aeternus',
  slashData: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe a central de ajuda dinâmica do Aeternus')
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Categoria específica para consultar')
        .setRequired(false)
    ),

  // Execução via Prefixo (O.ajuda)
  async execute(message, args, client) {
    const categoriaArgumento = args[0] ? args[0].toLowerCase() : null;

    if (categoriaArgumento) {
      const embed = construirEmbedCategoria(categoriaArgumento, message.author, client);
      return message.reply({ embeds: [embed] });
    }

    return enviarPainelInterativo(message, message.author, client);
  },

  // Execução via Slash (/ajuda)
  async executeSlash(interaction, client) {
    const categoriaArgumento = interaction.options.getString('categoria');

    if (categoriaArgumento) {
      const embed = construirEmbedCategoria(categoriaArgumento.toLowerCase(), interaction.user, client);
      return interaction.reply({ embeds: [embed] });
    }

    return enviarPainelInterativo(interaction, interaction.user, client, true);
  }
};

// Função para buscar comandos por categoria dinamicamente
function obterComandosDaCategoria(categoriaBuscada, client) {
  const comandosEncontrados = [];
  const commandsPath = path.join(__dirname, '..'); // Volta para a pasta /commands/

  if (fs.existsSync(commandsPath)) {
    const pastas = fs.readdirSync(commandsPath);

    for (const pasta of pastas) {
      if (pasta.toLowerCase() === categoriaBuscada.toLowerCase()) {
        const pastaPath = path.join(commandsPath, pasta);
        const arquivos = fs.readdirSync(pastaPath).filter(file => file.endsWith('.js'));

        for (const arquivo of arquivos) {
          const cmd = require(path.join(pastaPath, arquivo));
          if (cmd.name) {
            comandosEncontrados.push({
              nome: cmd.name,
              descricao: cmd.description || 'Sem descrição definida.'
            });
          }
        }
      }
    }
  }

  return comandosEncontrados;
}

// Função para montar o Embed da Categoria
function construirEmbedCategoria(chave, autor, client) {
  if (chave === 'inicio') {
    return new EmbedBuilder()
      .setTitle('🌌 Aeternus — Painel Principal')
      .setColor('#5865F2')
      .setDescription(
        `Olá! Eu sou o **Aeternus**, seu bot completo de **Apostas, Jogos, Moderação e Diversão**!\n\n` +
        `📌 **Prefixos suportados:** \`O.\` ou \`o.\` (Também aceito comandos Slash \`/\`)\n\n` +
        `💡 *Selecione uma categoria no menu abaixo para ver os comandos disponíveis, ou use \`O.ajuda <categoria>\`!*`
      )
      .setFooter({ text: `Aeternus Bot • Solicitado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
  }

  const infoCategoria = NOMES_CATEGORIAS[chave] || { nome: chave.toUpperCase(), emoji: '📁' };
  const comandos = obterComandosDaCategoria(chave, client);

  const embed = new EmbedBuilder()
    .setTitle(`${infoCategoria.emoji} Categoria: ${infoCategoria.nome}`)
    .setColor('#3498db')
    .setFooter({ text: `Aeternus Bot • Solicitado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (comandos.length === 0) {
    embed.setDescription('❌ Nenhum comando encontrado nesta categoria ainda.');
  } else {
    comandos.forEach(cmd => {
      embed.addFields({
        name: `\`O.${cmd.nome}\``,
        value: cmd.descricao,
        inline: false
      });
    });
  }

  return embed;
}

// Função para gerar o Menu Interativo dinamicamente
async function enviarPainelInterativo(contexto, autor, client, isSlash = false) {
  const commandsPath = path.join(__dirname, '..');
  const pastas = fs.readdirSync(commandsPath).filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory());

  // Opção inicial
  const opçõesMenu = [
    { label: 'Início / Apresentação', value: 'inicio', emoji: '🌌', description: 'Apresentação do Aeternus' }
  ];

  // Adiciona cada pasta existente como uma opção do Menu
  pastas.forEach(pasta => {
    const info = NOMES_CATEGORIAS[pasta] || { nome: pasta.toUpperCase(), emoji: '📁' };
    opçõesMenu.push({
      label: info.nome,
      value: pasta,
      emoji: info.emoji,
      description: `Comandos da categoria ${info.nome}`
    });
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_ajuda_dinamico')
    .setPlaceholder('📂 Escolha uma categoria...')
    .addOptions(opçõesMenu);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  const initialEmbed = construirEmbedCategoria('inicio', autor, client);

  const response = isSlash
    ? await contexto.reply({ embeds: [initialEmbed], components: [row], fetchReply: true })
    : await contexto.reply({ embeds: [initialEmbed], components: [row] });

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 68000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== autor.id) {
      return interaction.reply({ content: '❌ Apenas quem solicitou o comando pode usar este menu.', ephemeral: true });
    }

    const valorSelecionado = interaction.values[0];
    const novoEmbed = construirEmbedCategoria(valorSelecionado, autor, client);

    await interaction.update({ embeds: [novoEmbed] });
  });

  collector.on('end', () => {
    selectMenu.setDisabled(true);
    const disabledRow = new ActionRowBuilder().addComponents(selectMenu);
    response.edit({ components: [disabledRow] }).catch(() => {});
  });
}
