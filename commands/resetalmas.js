const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetalmas')
    .setDescription('Reseta as almas de um usuário (Apenas Administradores).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('O usuário que terá as almas resetadas')
        .setRequired(true)),
  name: 'resetalmas',
  category: 'Geral',
  aliases: ['resetaralmas', 'zeraralmas', 'resetsouls'],
  description: 'Reseta as almas de um usuário.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const member = ctx.member;

    // Verificação de permissão para comandos por prefixo (!)
    if (!isSlash && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply('❌ Você precisa da permissão de **Administrador** para usar este comando.');
    }

    let targetUser;

    if (isSlash) {
      targetUser = ctx.options.getUser('usuario');
    } else {
      targetUser = ctx.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);

      if (!targetUser) {
        return ctx.reply('❌ Mencione um usuário válido ou forneça o ID dele.\nExemplo: `!resetalmas @usuario`');
      }
    }

    const UserModel = mongoose.models.User || mongoose.model('User');
    let userData = await UserModel.findOne({ userId: targetUser.id });

    if (!userData || !userData.souls || userData.souls <= 0) {
      return ctx.reply(`⚠️ O usuário **${targetUser.username}** já possui **0** almas.`);
    }

    const almasAnteriores = userData.souls;
    userData.souls = 0;
    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle('🔄 Almas Resetadas!')
      .setColor('#E74C3C')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(`As almas de ${targetUser} foram resetadas com sucesso.`)
      .addFields(
        { name: '🔮 Almas Anteriores', value: `\`${almasAnteriores.toLocaleString()}\``, inline: true },
        { name: '🔮 Novo Total', value: '`0 almas`', inline: true }
      )
      .setFooter({ text: `Executado por: ${author.username}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
