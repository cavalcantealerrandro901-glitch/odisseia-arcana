const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'prefixo',
  aliases: ['setprefix', 'prefix'],
  description: 'Altera ou visualiza o prefixo do bot no servidor',
  slashData: new SlashCommandBuilder()
    .setName('prefixo')
    .setDescription('Altera ou visualiza o prefixo do servidor')
    .addStringOption(opt =>
      opt.setName('novo')
        .setDescription('O novo prefixo para o servidor')
        .setRequired(false)
    ),

  async execute(message, args, client, prefixAtual) {
    const novoPrefixo = args[0];

    if (!novoPrefixo) {
      return message.reply(`📌 O prefixo atual neste servidor é: \`${prefixAtual}\`\nPara alterar, use: \`${prefixAtual}prefixo <novo_prefixo>\``);
    }

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Você precisa de permissão de **Administrador** para alterar o prefixo!');
    }

    await Guild.findOneAndUpdate(
      { guildId: message.guild.id },
      { prefix: novoPrefixo },
      { upsert: true, new: true }
    );

    return message.reply(`✅ Prefixo alterado com sucesso para: \`${novoPrefixo}\``);
  },

  async executeSlash(interaction, client) {
    const novoPrefixo = interaction.options.getString('novo');

    let guildConfig = await Guild.findOne({ guildId: interaction.guildId });
    const prefixAtual = guildConfig?.prefix || process.env.PREFIX || '!';

    if (!novoPrefixo) {
      return interaction.reply({ content: `📌 O prefixo atual neste servidor é: \`${prefixAtual}\``, flags: [MessageFlags.Ephemeral] });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Você precisa de permissão de **Administrador** para alterar o prefixo!', flags: [MessageFlags.Ephemeral] });
    }

    await Guild.findOneAndUpdate(
      { guildId: interaction.guildId },
      { prefix: novoPrefixo },
      { upsert: true, new: true }
    );

    return interaction.reply({ content: `✅ Prefixo alterado com sucesso para: \`${novoPrefixo}\`` });
  }
};
