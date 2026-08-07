const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um usuário do servidor (Apenas Moderadores).')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => 
      opt.setName('usuario')
        .setDescription('O usuário que será banido')
        .setRequired(true))
    .addStringOption(opt => 
      opt.setName('motivo')
        .setDescription('Motivo do banimento')
        .setRequired(false)),
  name: 'ban',
  aliases: ['banir'],
  description: 'Bane um usuário do servidor.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const member = ctx.member;
    const guild = ctx.guild;

    if (!guild) return ctx.reply('❌ Este comando só pode ser usado dentro de um servidor.');

    // Verificação de permissão no modo por prefixo
    if (!isSlash && !member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return ctx.reply('❌ Você precisa da permissão de **Banir Membros** para usar este comando.');
    }

    let targetUser;
    let reason = 'Nenhum motivo fornecido.';

    if (isSlash) {
      targetUser = ctx.options.getUser('usuario');
      reason = ctx.options.getString('motivo') || reason;
    } else {
      targetUser = ctx.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
      if (args.length > 1) {
        const reasonArgs = args.filter(a => !a.includes('<@') && a !== targetUser?.id);
        if (reasonArgs.length > 0) reason = reasonArgs.join(' ');
      }
    }

    if (!targetUser) {
      return ctx.reply('❌ Mencione um usuário válido ou forneça o ID dele.\nExemplo: `!ban @usuario Motivo aqui`');
    }

    if (targetUser.id === author.id) {
      return ctx.reply('❌ Você não pode banir a si mesmo!');
    }

    if (targetUser.id === guild.ownerId) {
      return ctx.reply('❌ Você não pode banir o dono do servidor!');
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (targetMember) {
      if (!targetMember.bannable) {
        return ctx.reply('❌ Eu não tenho permissão para banir este usuário (o cargo dele é superior ou igual ao meu).');
      }

      if (member.roles.highest.position <= targetMember.roles.highest.position && author.id !== guild.ownerId) {
        return ctx.reply('❌ Você não pode banir um usuário que possui um cargo igual ou superior ao seu!');
      }
    }

    try {
      await guild.members.ban(targetUser.id, { reason: `${reason} (Banido por ${author.tag})` });
      await ctx.reply(`🔨 **USUÁRIO BANIDO!**\n• **Usuário:** ${targetUser.tag} (\`${targetUser.id}\`)\n• **Motivo:** ${reason}\n• **Autor:** ${author.tag}`);
    } catch (err) {
      console.error('Erro ao banir:', err);
      await ctx.reply('❌ Ocorreu um erro ao tentar banir o usuário.');
    }
  }
};
