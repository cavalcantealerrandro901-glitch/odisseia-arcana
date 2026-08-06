const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits,
  ComponentType,
  SlashCommandBuilder 
} = require('discord.js');

module.exports = {
  name: 'unban',
  aliases: ['desbanir'],
  description: 'Desbane um usuário do servidor pelo ID',
  slashData: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Desbane um usuário do servidor pelo ID')
    .addStringOption(option => 
      option.setName('id')
        .setDescription('ID do usuário a ser desbanido')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const userId = args[0];
    if (!userId) return message.reply('❓ Por favor, informe o ID do usuário que deseja desbanir.');

    return processarUnban(message, userId, message.author);
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const userId = interaction.options.getString('id');
    return processarUnban(interaction, userId, interaction.user, true);
  }
};

async function processarUnban(contexto, userId, autor, isSlash = false) {
  try {
    const bans = await contexto.guild.bans.fetch();
    const banInfo = bans.get(userId);

    if (!banInfo) {
      const msg = '❌ Este usuário não está na lista de banidos deste servidor.';
      return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
    }

    const embedConfirmacao = new EmbedBuilder()
      .setTitle('⚠️ Confirmação de Desbanimento')
      .setColor('#3498db')
      .setDescription(`Você está prestes a desbanir o usuário **${banInfo.user.tag}** (\`${userId}\`).`)
      .setFooter({ text: 'Você tem 68 segundos para confirmar.' })
      .setTimestamp();

    const botaoConfirmar = new ButtonBuilder()
      .setCustomId('confirmar_unban')
      .setLabel('Confirmar Desbanimento')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✅');

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

      try {
        await contexto.guild.members.unban(userId);

        const embedSucesso = new EmbedBuilder()
          .setTitle('🔓 Usuário Desbanido!')
          .setColor('#2ecc71')
          .setDescription(`O usuário **${banInfo.user.tag}** foi desbanido com sucesso!`)
          .setTimestamp();

        botaoConfirmar.setDisabled(true);
        const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

        await interaction.update({ embeds: [embedSucesso], components: [rowDesativada] });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: '❌ Erro ao tentar desbanir o usuário.', ephemeral: true });
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        botaoConfirmar.setDisabled(true);
        const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

        const embedExpirado = new EmbedBuilder()
          .setTitle('⏱️ Tempo Esgotado')
          .setColor('#95a5a6')
          .setDescription('O tempo de 68 segundos para confirmar expirou.')
          .setTimestamp();

        mensagemResposta.edit({ embeds: [embedExpirado], components: [rowDesativada] }).catch(() => {});
      }
    });
  } catch (error) {
    console.error(error);
    const msgErro = '❌ Ocorreu um erro ao consultar os banimentos.';
    return isSlash ? contexto.reply({ content: msgErro, ephemeral: true }) : contexto.reply(msgErro);
  }
}
