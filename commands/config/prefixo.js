const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Guild = require('../../database/schemas/Guild');

module.exports = {
  name: 'prefixo',
  aliases: ['setprefix', 'prefix'],
  description: 'Altera o prefixo de comandos do servidor',
  slashData: new SlashCommandBuilder()
    .setName('prefixo')
    .setDescription('Altera o prefixo de comandos do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('novo_prefixo')
        .setDescription('O novo prefixo para o bot neste servidor')
        .setRequired(true)
    ),

  async execute(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Você precisa da permissão de **Administrador** para alterar o prefixo!');
    }

    const novoPrefixo = args[0];
    if (!novoPrefixo) {
      return message.reply(`❌ Informe o novo prefixo! Exemplo: \`${prefix}prefixo !\``);
    }

    if (novoPrefixo.length > 5) {
      return message.reply('❌ O prefixo não pode ter mais de 5 caracteres.');
    }

    await Guild.findOneAndUpdate(
      { guildId: message.guild.id },
      { prefix: novoPrefixo },
      { returnDocument: 'after', upsert: true }
    );

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('⚙️ Prefixo Alterado!')
      .setDescription(`O prefixo do servidor foi alterado com sucesso para: \`${novoPrefixo}\``)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction, client) {
    const novoPrefixo = interaction.options.getString('novo_prefixo');

    if (novoPrefixo.length > 5) {
      return interaction.reply({ content: '❌ O prefixo não pode ter mais de 5 caracteres.', ephemeral: true });
    }

    await Guild.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { prefix: novoPrefixo },
      { returnDocument: 'after', upsert: true }
    );

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('⚙️ Prefixo Alterado!')
      .setDescription(`O prefixo do servidor foi alterado com sucesso para: \`${novoPrefixo}\``)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
