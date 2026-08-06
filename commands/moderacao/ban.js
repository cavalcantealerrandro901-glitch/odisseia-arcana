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
  name: 'ban',
  aliases: ['banir'],
  description: 'Bane um membro do servidor após confirmação',
  slashData: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um membro do servidor após confirmação')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro a ser banido')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('Motivo do banimento')
        .setRequired(false)
    ),

  // Execução via Prefixo (O.ban)
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply('❓ Por favor, mencione um membro ou forneça um ID válido.');

    const motivo = args.slice(1).join(' ') || 'Nenhum motivo fornecido.';
    return processarBan(message, target, motivo, message.author);
  },

  // Execução via Slash Command (/ban)
  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const target = interaction.options.getMember('usuario');
    if (!target) return interaction.reply({ content: '❓ Membro não encontrado neste servidor.', ephemeral: true });

    const motivo = interaction.options.getString('motivo') || 'Nenhum motivo fornecido.';
    return processarBan(interaction, target, motivo, interaction.user, true);
  }
};

async function processarBan(contexto, target, motivo, autor, isSlash = false) {
  if (target.id === autor.id) {
    const msg = '❌ Você não pode banir a si mesmo.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }
  if (!target.bannable) {
    const msg = '❌ Não consigo banir este usuário (cargo superior ao meu).';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const embedConfirmacao = new EmbedBuilder()
    .setTitle('⚠️ Confirmação de Banimento')
    .setColor('#e74c3c')
    .setDescription(`Você está prestes a banir o membro **${target.user.tag}**.\n\n**Motivo:** ${motivo}`)
    .setFooter({ text: 'Você tem 68 segundos para confirmar.' })
    .setTimestamp();

  const botaoConfirmar = new ButtonBuilder()
    .setCustomId('confirmar_ban')
    .setLabel('Confirmar Punição')
    .setStyle(ButtonStyle.Danger)
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
      await target.ban({ reason: `${motivo} | Banido por: ${autor.tag}` });

      const embedSucesso = new EmbedBuilder()
        .setTitle('🔨 Membro Banido!')
        .setColor('#2ecc71')
        .setDescription(`O usuário **${target.user.tag}** foi banido com sucesso.\n**Motivo:** ${motivo}`)
        .setTimestamp();

      botaoConfirmar.setDisabled(true);
      const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

      await interaction.update({ embeds: [embedSucesso], components: [rowDesativada] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Erro ao tentar banir o membro.', ephemeral: true });
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      botaoConfirmar.setDisabled(true);
      const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

      const embedExpirado = new EmbedBuilder()
        .setTitle('⏱️ Tempo Esgotado')
        .setColor('#95a5a6')
        .setDescription('O tempo de 68 segundos para confirmar o banimento expirou e a ação foi cancelada.')
        .setTimestamp();

      mensagemResposta.edit({ embeds: [embedExpirado], components: [rowDesativada] }).catch(() => {});
    }
  });
}
