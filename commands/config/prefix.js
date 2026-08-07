const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/config.json' });

module.exports = {
  name: 'prefix',
  aliases: ['setprefix', 'prefixo', 'mudarprefixo'],
  description: 'Altera o prefixo dos comandos do bot neste servidor',
  slashData: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Altera o prefixo do bot no servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('novo_prefixo')
        .setDescription('O novo prefixo a ser utilizado (ex: !, ., ?)')
        .setRequired(true)
        .setMaxLength(5)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('Você precisa da permissão **Gerenciar Servidor** para alterar o prefixo.');
    }

    const novoPrefixo = args[0];
    if (!novoPrefixo) {
      return message.reply('Informe o novo prefixo! Exemplo: `O.prefix !`');
    }

    if (novoPrefixo.length > 5) {
      return message.reply('O prefixo não pode ter mais que 5 caracteres.');
    }

    await db.set(`prefix_${message.guild.id}`, novoPrefixo);
    return message.reply(`Prefixo alterado com sucesso para \`${novoPrefixo}\`!`);
  },

  async executeSlash(interaction, client) {
    const novoPrefixo = interaction.options.getString('novo_prefixo');

    await db.set(`prefix_${interaction.guild.id}`, novoPrefixo);
    return interaction.reply({ content: `Prefixo alterado com sucesso para \`${novoPrefixo}\`!`, ephemeral: true });
  }
};
