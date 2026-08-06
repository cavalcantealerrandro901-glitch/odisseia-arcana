const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ChannelType,
  SlashCommandBuilder 
} = require('discord.js');

module.exports = {
  name: 'unlockdown',
  aliases: ['destrancartudo', 'desbloqueartudo'],
  description: 'Destranca todos os canais de texto do servidor após um lockdown',
  slashData: new SlashCommandBuilder()
    .setName('unlockdown')
    .setDescription('Destranca todos os canais de texto do servidor'),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    return executarUnlockdown(message, message.author);
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    await interaction.deferReply();
    return executarUnlockdown(interaction, interaction.user, true);
  }
};

async function executarUnlockdown(contexto, autor, isSlash = false) {
  try {
    const canaisTexto = contexto.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);

    for (const [id, canal] of canaisTexto) {
      await canal.permissionOverwrites.edit(contexto.guild.roles.everyone, {
        SendMessages: null
      }).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setTitle('🔓 LOCKDOWN FINALIZADO!')
      .setColor('#2ecc71')
      .setDescription(`Todos os **${canaisTexto.size}** canais de texto foram liberados novamente.`)
      .setFooter({ text: `Executado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (isSlash) {
      await contexto.editReply({ embeds: [embed] });
    } else {
      await contexto.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error(error);
    const msgErro = '❌ Erro ao tentar remover o lockdown dos canais.';
    if (isSlash) {
      await contexto.editReply({ content: msgErro });
    } else {
      await contexto.reply(msgErro);
    }
  }
}
