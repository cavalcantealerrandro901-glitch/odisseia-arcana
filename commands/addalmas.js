const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addalmas')
    .setDescription('Adiciona almas para um usuário (Apenas Administradores).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('O usuário que receberá as almas')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('quantidade')
        .setDescription('A quantidade de almas a adicionar')
        .setRequired(true)
        .setMinValue(1)),
  name: 'addalmas',
  aliases: ['add-almas', 'daralmas', 'addsouls'],
  description: 'Adiciona almas para um usuário.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const member = ctx.member;

    // Verifica permissão de Administrador no modo por Prefixo
    if (!isSlash && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply('❌ Você precisa da permissão de **Administrador** para usar este comando.');
    }

    let targetUser;
    let amount;

    if (isSlash) {
      targetUser = ctx.options.getUser('usuario');
      amount = ctx.options.getInteger('quantidade');
    } else {
      targetUser = ctx.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
      amount = parseInt(args[1], 10);

      if (!targetUser) {
        return ctx.reply('❌ Mencione um usuário válido ou forneça o ID dele.\nExemplo: `!addalmas @usuario 100`');
      }
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Informe uma quantidade válida de almas maior que 0.');
      }
    }

    if (targetUser.bot) {
      return ctx.reply('❌ Você não pode adicionar almas para um bot!');
    }

    const UserModel = mongoose.models.User || mongoose.model('User');
    let userData = await UserModel.findOne({ userId: targetUser.id });

    if (!userData) {
      userData = new UserModel({ userId: targetUser.id });
    }

    userData.souls = (userData.souls || 0) + amount;
    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle('✨ Almas Concedidas!')
      .setColor('#9B59B6')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(`Foram adicionadas **${amount.toLocaleString()} almas** para ${targetUser}!`)
      .addFields(
        { name: '🔮 Novo Total de Almas', value: `\`${userData.souls.toLocaleString()}\` almas`, inline: true }
      )
      .setFooter({ text: `Executado por: ${author.username}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
};
