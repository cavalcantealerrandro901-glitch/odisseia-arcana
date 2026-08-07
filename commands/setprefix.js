const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Altera o prefixo de comandos do servidor.')
    .addStringOption(opt => opt.setName('novo_prefixo').setDescription('Novo caractere (ex: !, ., ?)').setRequired(true)),
  name: 'setprefix',
  category: 'Geral',
  description: 'Altera o prefixo de comandos do servidor.',
  async execute(ctx, client, isSlash, args = []) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply({ content: '❌ Você precisa de permissão de **Administrador**.' });
    }

    const newPrefix = isSlash ? ctx.options.getString('novo_prefixo') : args[0];
    if (!newPrefix || newPrefix.length > 3) {
      return ctx.reply({ content: '❌ Digite um prefixo válido de até 3 caracteres.' });
    }

    await client.setPrefix(ctx.guild.id, newPrefix);

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Prefixo Alterado')
      .setColor('#5865F2')
      .setDescription(`O prefixo do servidor agora é: \`${newPrefix}\``)
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
