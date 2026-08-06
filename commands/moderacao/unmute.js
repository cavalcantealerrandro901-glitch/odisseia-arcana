const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  SlashCommandBuilder 
} = require('discord.js');

module.exports = {
  name: 'unmute',
  aliases: ['dessilenciar', 'removel-timeout'],
  description: 'Remove o silenciamento (timeout) de um membro',
  slashData: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove o silenciamento de um membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro a ter o silêncio removido')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply('❓ Por favor, mencione um membro ou forneça um ID válido.');

    return removerMute(message, target, message.author);
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const target = interaction.options.getMember('usuario');
    if (!target) return interaction.reply({ content: '❓ Membro não encontrado.', ephemeral: true });

    return removerMute(interaction, target, interaction.user, true);
  }
};

async function removerMute(contexto, target, autor, isSlash = false) {
  try {
    await target.timeout(null, `Silêncio removido por: ${autor.tag}`);

    const embed = new EmbedBuilder()
      .setTitle('🔊 Silêncio Removido!')
      .setColor('#2ecc71')
      .setDescription(`O membro **${target.user.tag}** agora pode falar normalmente.`)
      .setFooter({ text: `Solicitado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (isSlash) {
      await contexto.reply({ embeds: [embed] });
    } else {
      await contexto.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error(error);
    const msgErro = '❌ Ocorreu um erro ao tentar remover o silêncio.';
    if (isSlash) {
      await contexto.reply({ content: msgErro, ephemeral: true });
    } else {
      await contexto.reply(msgErro);
    }
  }
}
