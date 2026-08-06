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
  name: 'kick',
  aliases: ['expulsar'],
  description: 'Expulsa um membro do servidor após confirmação',
  slashData: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa um membro do servidor após confirmação')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro a ser expulsos')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('Motivo da expulsão')
        .setRequired(false)
    ),

  // Execução via Prefixo
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply('❓ Por favor, mencione um membro ou forneça um ID válido.');

    const motivo = args.slice(1).join(' ') || 'Nenhum motivo fornecido.';
    return processarKick(message, target, motivo, message.author);
  },

  // Execução via Slash Command
  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const target = interaction.options.getMember('usuario');
    if (!target) return interaction.reply({ content: '❓ Membro não encontrado neste servidor.', ephemeral: true });

    const motivo = interaction.options.getString('motivo') || 'Nenhum motivo fornecido.';
    return processarKick(interaction, target, motivo, interaction.user, true);
  }
};

async function processarKick(contexto, target, motivo, autor, isSlash = false) {
  if (target.id === autor.id) {
    const msg = '❌ Você não pode expulsar a si mesmo.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }
  if (!target.kickable) {
    const msg = '❌ Não consigo expulsar este usuário (cargo superior ao meu).';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const embedConfirmacao = new EmbedBuilder()
    .setTitle('⚠️ Confirmação de Expulsão')
    .setColor('#e67e22')
    .setDescription(`Você está prestes a expulsar o membro **${target.user.tag}**.\n\n**Motivo:** ${motivo}`)
    .setFooter({ text: 'Você tem 68 segundos para confirmar.' })
    .setTimestamp();

  const botaoConfirmar = new ButtonBuilder()
    .setCustomId('confirmar_kick')
    .setLabel('Confirmar Expulsão')
    .setStyle(ButtonStyle.Warning)
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
      await target.kick(`${motivo} | Expulso por: ${autor.tag}`);

      const embedSucesso = new EmbedBuilder()
        .setTitle('👢 Membro Expulso!')
        .setColor('#2ecc71')
        .setDescription(`O usuário **${target.user.tag}** foi expulsos com sucesso.\n**Motivo:** ${motivo}`)
        .setTimestamp();

      botaoConfirmar.setDisabled(true);
      const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

      await interaction.update({ embeds: [embedSucesso], components: [rowDesativada] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Erro ao tentar expulsar o membro.', ephemeral: true });
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      botaoConfirmar.setDisabled(true);
      const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

      const embedExpirado = new EmbedBuilder()
        .setTitle('⏱️ Tempo Esgotado')
        .setColor('#95a5a6')
        .setDescription('O tempo de 68 segundos para confirmar a expulsão expirou e a ação foi cancelada.')
        .setTimestamp();

      mensagemResposta.edit({ embeds: [embedExpirado], components: [rowDesativada] }).catch(() => {});
    }
  });
}
