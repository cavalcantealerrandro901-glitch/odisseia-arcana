const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

// Definir Schema de Configuração do Servidor para os Logs (se não existir)
const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannelId: { type: String, default: null }
});
const GuildConfig = mongoose.models.GuildConfig || mongoose.model('GuildConfig', guildConfigSchema);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('can')
    .setDescription('Comandos de configuração do servidor.')
    .addSubcommand(sub =>
      sub
        .setName('logs')
        .setDescription('Define ou remove o canal de logs do servidor.')
        .addChannelOption(opt =>
          opt.setName('canal')
            .setDescription('Canal onde os logs serão enviados (deixe vazio para desativar)')
            .setRequired(false))
    ),
  name: 'can',
  category: 'Configuração',
  description: 'Configura o sistema de logs do servidor.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const guild = ctx.guild;

    const member = guild.members.cache.get(author.id);
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return ctx.reply({ content: '❌ Você precisa da permissão de **Gerenciar Servidor** para usar este comando!', ephemeral: true });
    }

    let targetChannel = null;
    if (isSlash) {
      targetChannel = ctx.options.getChannel('canal');
    } else {
      if (ctx.mentions && ctx.mentions.channels.size > 0) {
        targetChannel = ctx.mentions.channels.first();
      } else if (args[1]) {
        targetChannel = guild.channels.cache.get(args[1].replace(/[<#>]/g, ''));
      }
    }

    let config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config) {
      config = new GuildConfig({ guildId: guild.id });
    }

    if (!targetChannel) {
      // Desativar logs se nenhum canal foi informado
      config.logChannelId = null;
      await config.save();
      return ctx.reply('🔒 O sistema de **logs** foi **desativado** neste servidor.');
    }

    config.logChannelId = targetChannel.id;
    await config.save();

    const successEmbed = new EmbedBuilder()
      .setTitle('🛡️ Canal de Logs Configurado')
      .setColor(0x3498db)
      .setDescription(`O canal de auditoria foi definido com sucesso para ${targetChannel}!\n\nAgora todas as ações (mensagens apagadas/editadas, entradas/saídas, cargos e canais) serão registradas aqui.`)
      .setTimestamp();

    await ctx.reply({ embeds: [successEmbed] });
  }
};
