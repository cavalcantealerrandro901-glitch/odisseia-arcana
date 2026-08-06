const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  SlashCommandBuilder 
} = require('discord.js');

module.exports = {
  name: 'lock',
  aliases: ['trancar', 'bloquear'],
  description: 'Tranca o canal atual para impedir mensagens de membros',
  slashData: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Tranca o canal atual para impedir mensagens de membros')
    .addStringOption(option =>
      option.setName('motivo')
        .setDescription('Motivo do bloqueio')
        .setRequired(false)
    ),

  // Execução via Prefixo (O.lock)
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const motivo = args.join(' ') || 'Nenhum motivo fornecido.';
    return trancarCanal(message.channel, motivo, message.author, message);
  },

  // Execução via Slash (/lock)
  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const motivo = interaction.options.getString('motivo') || 'Nenhum motivo fornecido.';
    return trancarCanal(interaction.channel, motivo, interaction.user, interaction, true);
  }
};

async function trancarCanal(channel, motivo, autor, contexto, isSlash = false) {
  try {
    // Altera a permissão do cargo @everyone para impedir o envio de mensagens
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
      SendMessages: false
    });

    const embed = new EmbedBuilder()
      .setTitle('🔒 Canal Trancado!')
      .setColor('#e74c3c')
      .setDescription(`Este canal foi bloqueado para o envio de novas mensagens.\n\n**Motivo:** ${motivo}`)
      .setFooter({ text: `Trancado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (isSlash) {
      await contexto.reply({ embeds: [embed] });
    } else {
      await contexto.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error(error);
    const msgErro = '❌ Ocorreu um erro ao tentar trancar este canal.';
    if (isSlash) {
      await contexto.reply({ content: msgErro, ephemeral: true });
    } else {
      await contexto.reply(msgErro);
    }
  }
}
