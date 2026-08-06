const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  SlashCommandBuilder 
} = require('discord.js');

module.exports = {
  name: 'unlock',
  aliases: ['destrancar', 'desbloquear'],
  description: 'Destranca o canal atual liberando as mensagens para os membros',
  slashData: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Destranca o canal atual liberando as mensagens'),

  // Execução via Prefixo (O.unlock)
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    return destrancarCanal(message.channel, message.author, message);
  },

  // Execução via Slash (/unlock)
  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    return destrancarCanal(interaction.channel, interaction.user, interaction, true);
  }
};

async function destrancarCanal(channel, autor, contexto, isSlash = false) {
  try {
    // Restaura a permissão do cargo @everyone (null volta ao padrão do canal/categoria)
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
      SendMessages: null
    });

    const embed = new EmbedBuilder()
      .setTitle('🔓 Canal Destrancado!')
      .setColor('#2ecc71')
      .setDescription('Este canal foi liberado novamente. Os membros já podem conversar!')
      .setFooter({ text: `Destrancado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (isSlash) {
      await contexto.reply({ embeds: [embed] });
    } else {
      await contexto.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error(error);
    const msgErro = '❌ Ocorreu um erro ao tentar destrancar este canal.';
    if (isSlash) {
      await contexto.reply({ content: msgErro, ephemeral: true });
    } else {
      await contexto.reply(msgErro);
    }
  }
}
