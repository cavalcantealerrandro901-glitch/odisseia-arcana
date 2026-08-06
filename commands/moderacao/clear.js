const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  SlashCommandBuilder 
} = require('discord.js');

module.exports = {
  name: 'clear',
  aliases: ['limpar', 'purge'],
  description: 'Limpa de 1 a 100 mensagens do chat (respeita o limite de 14 dias)',
  slashData: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Limpa de 1 a 100 mensagens do chat')
    .addIntegerOption(option =>
      option.setName('quantidade')
        .setDescription('Número de mensagens a serem apagadas (1 a 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  // Execução via Prefixo (O.clear 60)
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const quantidade = parseInt(args[0]);

    if (!quantidade || isNaN(quantidade) || quantidade < 1 || quantidade > 100) {
      return message.reply('❓ Por favor, informe um número válido de mensagens para apagar (entre 1 e 100).');
    }

    // Apaga a mensagem do comando primeiro para não contar na limpeza
    await message.delete().catch(() => {});

    return executarLimpeza(message.channel, quantidade, message.author);
  },

  // Execução via Slash (/clear)
  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const quantidade = interaction.options.getInteger('quantidade');

    // Resposta inicial temporária (para o Discord não dar timeout)
    await interaction.deferReply({ ephemeral: true });

    return executarLimpeza(interaction.channel, quantidade, interaction.user, interaction);
  }
};

async function executarLimpeza(channel, quantidadeDesejada, autor, interaction = null) {
  try {
    // O segundo parâmetro 'true' faz o Discord filtrar automaticamente mensagens > 14 dias
    const mensagensApagadas = await channel.bulkDelete(quantidadeDesejada, true);

    const apagarEfetivas = mensagensApagadas.size;
    const faltaram = quantidadeDesejada - apagarEfetivas;

    // Monta a mensagem de resposta
    let textoResultado = `🧹 Foram apagadas **${apagarEfetivas}** mensagem(ns) com sucesso!`;

    if (faltaram > 0) {
      textoResultado += `\n⚠️ **${faltaram}** mensagem(ns) não puderam ser apagadas por terem **mais de 14 dias** (limitação da API do Discord).`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🧹 Limpeza de Chat')
      .setColor(faltaram > 0 ? '#e67e22' : '#2ecc71')
      .setDescription(textoResultado)
      .setFooter({ text: `Solicitado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (interaction) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      const msgAviso = await channel.send({ embeds: [embed] });
      // Apaga o aviso de limpeza após 7 segundos para manter o chat limpo
      setTimeout(() => msgAviso.delete().catch(() => {}), 7000);
    }
  } catch (error) {
    console.error(error);
    const msgErro = '❌ Ocorreu um erro ao tentar apagar as mensagens.';
    if (interaction) {
      await interaction.editReply({ content: msgErro });
    } else {
      channel.send(msgErro);
    }
  }
}
