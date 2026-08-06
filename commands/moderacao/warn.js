const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits,
  ComponentType,
  SlashCommandBuilder 
} = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/warns.json' });

module.exports = {
  name: 'warn',
  aliases: ['avisar', 'advertir'],
  description: 'Adiciona uma advertência a um membro após confirmação',
  slashData: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Adiciona uma advertência a um membro após confirmação')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro a ser advertido')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('motivo')
        .setDescription('Motivo da advertência')
        .setRequired(false)
    ),

  // Execução via Prefixo (O.warn @user motivo)
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply('❓ Por favor, mencione um membro ou forneça um ID válido.');

    const motivo = args.slice(1).join(' ') || 'Nenhum motivo fornecido.';
    return processarWarn(message, target, motivo, message.author);
  },

  // Execução via Slash (/warn)
  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const target = interaction.options.getMember('usuario');
    if (!target) return interaction.reply({ content: '❓ Membro não encontrado neste servidor.', ephemeral: true });

    const motivo = interaction.options.getString('motivo') || 'Nenhum motivo fornecido.';
    return processarWarn(interaction, target, motivo, interaction.user, true);
  }
};

async function processarWarn(contexto, target, motivo, autor, isSlash = false) {
  if (target.id === autor.id) {
    const msg = '❌ Você não pode advertir a si mesmo.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const embedConfirmacao = new EmbedBuilder()
    .setTitle('⚠️ Confirmação de Advertência')
    .setColor('#f1c40f')
    .setDescription(`Você está prestes a advertir o membro **${target.user.tag}**.\n\n**Motivo:** ${motivo}`)
    .setFooter({ text: 'Você tem 68 segundos para confirmar.' })
    .setTimestamp();

  const botaoConfirmar = new ButtonBuilder()
    .setCustomId('confirmar_warn')
    .setLabel('Confirmar Advertência')
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
      // Salva e incrementa os avisos no banco de dados
      const chave = `warns_${contexto.guild.id}_${target.id}`;
      const avisosAtuais = (await db.get(chave)) || 0;
      const novosAvisos = avisosAtuais + 1;
      await db.set(chave, novosAvisos);

      const embedSucesso = new EmbedBuilder()
        .setTitle('⚠️ Membro Advertido!')
        .setColor('#2ecc71')
        .setDescription(`O membro **${target.user.tag}** recebeu uma advertência.\n\n**Motivo:** ${motivo}\n**Total de avisos:** \`${novosAvisos}\``)
        .setTimestamp();

      botaoConfirmar.setDisabled(true);
      const rowDesativada = new ActionRowBuilder().addComponents(botaoConfirmar);

      await interaction.update({ embeds: [embedSucesso], components: [rowDesativada] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Erro ao registrar a advertência.', ephemeral: true });
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
