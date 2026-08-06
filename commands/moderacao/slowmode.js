const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  SlashCommandBuilder 
} = require('discord.js');

module.exports = {
  name: 'slowmode',
  aliases: ['modolento', 'cooldown'],
  description: 'Altera o tempo do modo lento no canal (0 para desativar)',
  slashData: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Altera o tempo do modo lento no canal')
    .addIntegerOption(option =>
      option.setName('segundos')
        .setDescription('Tempo em segundos (0 para desativar, máx 21600)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const segundos = parseInt(args[0]);
    if (isNaN(segundos) || segundos < 0 || segundos > 21600) {
      return message.reply('❓ Informe um tempo em segundos entre 0 e 21600 (6 horas).');
    }

    return alterarSlowmode(message.channel, segundos, message.author, message);
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const segundos = interaction.options.getInteger('segundos');
    return alterarSlowmode(interaction.channel, segundos, interaction.user, interaction, true);
  }
};

async function alterarSlowmode(channel, segundos, autor, contexto, isSlash = false) {
  try {
    await channel.setRateLimitPerUser(segundos);

    const embed = new EmbedBuilder()
      .setTitle('⏱️ Modo Lento Alterado')
      .setColor('#3498db')
      .setDescription(
        segundos === 0 
          ? 'O modo lento foi **desativado** neste canal.' 
          : `O tempo de espera entre mensagens foi definido para **${segundos} segundo(s)**.`
      )
      .setFooter({ text: `Alterado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (isSlash) {
      await contexto.reply({ embeds: [embed] });
    } else {
      await contexto.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error(error);
    const msgErro = '❌ Erro ao tentar alterar o modo lento.';
    if (isSlash) {
      await contexto.reply({ content: msgErro, ephemeral: true });
    } else {
      await contexto.reply(msgErro);
    }
  }
}
