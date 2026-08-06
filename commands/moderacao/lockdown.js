const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ComponentType,
  ChannelType,
  SlashCommandBuilder 
} = require('discord.js');

module.exports = {
  name: 'lockdown',
  aliases: ['trancartudo', 'bloqueartudo'],
  description: 'Tranca todos os canais de texto do servidor em caso de emergência',
  slashData: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Tranca todos os canais de texto do servidor')
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('Motivo do lockdown')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const motivo = args.join(' ') || 'Nenhum motivo fornecido.';
    return processarLockdown(message, motivo, message.author);
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const motivo = interaction.options.getString('motivo') || 'Nenhum motivo fornecido.';
    return processarLockdown(interaction, motivo, interaction.user, true);
  }
};

async function processarLockdown(contexto, motivo, autor, isSlash = false) {
  const embedConfirmacao = new EmbedBuilder()
    .setTitle('🚨 ATENÇÃO: Confirmação de Lockdown')
    .setColor('#d63031')
    .setDescription(`Você está prestes a **TRANCAR TODOS OS CANAIS DE TEXTO** do servidor.\n\n**Motivo:** ${motivo}`)
    .setFooter({ text: 'Você tem 68 segundos para confirmar.' })
    .setTimestamp();

  const botaoConfirmar = new ButtonBuilder()
    .setCustomId('confirmar_lockdown')
    .setLabel('Confirmar Lockdown Geral')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🚨');

  const row = new ActionRowBuilder().addComponents(botaoConfirmar);

  const mensagemResposta = isSlash
    ? await contexto.reply({ embeds: [embedConfirmacao], components: [row], fetchReply: true })
    : await contexto.reply({ embeds: [embedConfirmacao], components: [row] });

  const collector = mensagemResposta.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 68000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== autor.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas o administrador que executou o comando pode confirmar.', ephemeral: true });
    }

    await interaction.deferUpdate();

    try {
      const canaisTexto = contexto.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);

      for (const [id, canal] of canaisTexto) {
        await canal.permissionOverwrites.edit(contexto.guild.roles.everyone, {
          SendMessages: false
        }).catch(() => {});
      }

      const embedSucesso = new EmbedBuilder()
        .setTitle('🚨 LOCKDOWN ATIVADO!')
        .setColor('#2ecc71')
        .setDescription(`Todos os **${canaisTexto.size}** canais de texto foram trancados com sucesso.\n\n**Motivo:** ${motivo}`)
        .setTimestamp();

      botaoConfirmar.setDisabled(true);
      const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

      await interaction.editReply({ embeds: [embedSucesso], components: [rowDesativada] });
    } catch (error) {
      console.error(error);
      await interaction.followUp({ content: '❌ Ocorreu um erro durante o lockdown.', ephemeral: true });
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      botaoConfirmar.setDisabled(true);
      const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

      const embedExpirado = new EmbedBuilder()
        .setTitle('⏱️ Tempo Esgotado')
        .setColor('#95a5a6')
        .setDescription('O tempo de 68 segundos para confirmar o lockdown expirou.')
        .setTimestamp();

      mensagemResposta.edit({ embeds: [embedExpirado], components: [rowDesativada] }).catch(() => {});
    }
  });
}
