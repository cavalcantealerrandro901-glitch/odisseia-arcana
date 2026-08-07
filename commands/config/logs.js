const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/config.json' });

module.exports = {
  name: 'logs',
  aliases: ['setlogs', 'canal-logs'],
  description: 'Define o canal de texto para onde as logs do servidor serão enviadas',
  slashData: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Define o canal de logs do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Selecione o canal onde as logs serão registradas')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ Você precisa da permissão **Gerenciar Servidor** para usar este comando.');
    }

    const canal = message.mentions.channels.first();
    if (!canal || canal.type !== ChannelType.GuildText) {
      return message.reply('⚠️ Mencione um canal de texto válido! Exemplo: `O.logs #logs`');
    }

    await db.set(`logs_channel_${message.guild.id}`, canal.id);
    return message.reply(`✅ Canal de logs definido com sucesso para ${canal}!`);
  },

  async executeSlash(interaction, client) {
    const canal = interaction.options.getChannel('canal');

    await db.set(`logs_channel_${interaction.guild.id}`, canal.id);
    return interaction.reply({ content: `✅ Canal de logs definido com sucesso para ${canal}!`, ephemeral: true });
  }
};
