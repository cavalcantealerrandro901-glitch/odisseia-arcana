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
  name: 'mute',
  aliases: ['silenciar', 'castigo', 'timeout'],
  description: 'Silencia um membro por um tempo determinado após confirmação',
  slashData: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silencia um membro por um tempo determinado após confirmação')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro a ser silenciado')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('minutos')
        .setDescription('Tempo de silenciamento em minutos (ex: 10)')
        .setRequired(false)
    )
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('Motivo do silenciamento')
        .setRequired(false)
    ),

  // Execução via Prefixo (O.mute @user 10 motivo)
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply('❓ Por favor, mencione um membro ou forneça um ID válido.');

    const minutos = parseInt(args[1]) || 10;
    const motivo = args.slice(2).join(' ') || 'Nenhum motivo fornecido.';

    return processarMute(message, target, minutos, motivo, message.author);
  },

  // Execução via Slash (/mute)
  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const target = interaction.options.getMember('usuario');
    if (!target) return interaction.reply({ content: '❓ Membro não encontrado neste servidor.', ephemeral: true });

    const minutos = interaction.options.getInteger('minutos') || 10;
    const motivo = interaction.options.getString('motivo') || 'Nenhum motivo fornecido.';

    return processarMute(interaction, target, minutos, motivo, interaction.user, true);
  }
};

async function processarMute(contexto, target, minutos, motivo, autor, isSlash = false) {
  if (target.id === autor.id) {
    const msg = '❌ Você não pode silenciar a si mesmo.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  if (!target.moderatable) {
    const msg = '❌ Não consigo silenciar este usuário (ele possui um cargo mais alto que o meu).';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const embedConfirmacao = new EmbedBuilder()
    .setTitle('⚠️ Confirmação de Silenciamento')
    .setColor('#f39c12')
    .setDescription(`Você está prestes a silenciar **${target.user.tag}** por **${minutos} minuto(s)**.\n\n**Motivo:** ${motivo}`)
    .setFooter({ text: 'Você tem 68 segundos para confirmar.' })
    .setTimestamp();

  const botaoConfirmar = new ButtonBuilder()
    .setCustomId('confirmar_mute')
    .setLabel('Confirmar Silenciamento')
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
      const ms = minutos * 60 * 1000;
      await target.timeout(ms, `${motivo} | Silenciado por: ${autor.tag}`);

      const embedSucesso = new EmbedBuilder()
        .setTitle('🤐 Membro Silenciado!')
        .setColor('#2ecc71')
        .setDescription(`O usuário **${target.user.tag}** foi silenciado por **${minutos} minuto(s)**.\n**Motivo:** ${motivo}`)
        .setTimestamp();

      botaoConfirmar.setDisabled(true);
      const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

      await interaction.update({ embeds: [embedSucesso], components: [rowDesativada] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Erro ao tentar silenciar o membro.', ephemeral: true });
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      botaoConfirmar.setDisabled(true);
      const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

      const embedExpirado = new EmbedBuilder()
        .setTitle('⏱️ Tempo Esgotado')
        .setColor('#95a5a6')
        .setDescription('O tempo de 68 segundos para confirmar expirou e a ação foi cancelada.')
        .setTimestamp();

      mensagemResposta.edit({ embeds: [embedExpirado], components: [rowDesativada] }).catch(() => {});
    }
  });
}
