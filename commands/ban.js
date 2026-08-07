const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  PermissionFlagsBits 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um usuário do servidor com confirmação.')
    .addUserOption(opt => 
      opt.setName('usuario')
        .setDescription('Usuário que deseja banir')
        .setRequired(true))
    .addStringOption(opt => 
      opt.setName('motivo')
        .setDescription('Motivo do banimento')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  name: 'ban',
  category: 'Moderação',
  description: 'Bane um usuário do servidor com painel de confirmação.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    
    // Verificar permissão de quem executou
    const member = ctx.guild.members.cache.get(author.id);
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return ctx.reply({ content: '❌ Você não tem permissão para usar este comando!', ephemeral: true });
    }

    let targetUser = null;
    let reason = 'Nenhum motivo especificado.';

    if (isSlash) {
      targetUser = ctx.options.getUser('usuario');
      reason = ctx.options.getString('motivo') || reason;
    } else {
      if (ctx.mentions && ctx.mentions.users.size > 0) {
        targetUser = ctx.mentions.users.first();
      } else if (args[0]) {
        targetUser = client.users.cache.get(args[0].replace(/[<@!>]/g, ''));
      }
      if (args.length > 1) {
        reason = args.slice(1).join(' ');
      }
    }

    if (!targetUser) {
      return ctx.reply('❌ Você precisa mencionar ou fornecer o ID de um usuário válido para banir!');
    }

    if (targetUser.id === author.id) {
      return ctx.reply('❌ Você não pode banir a si mesmo!');
    }

    if (targetUser.id === client.user.id) {
      return ctx.reply('❌ Você não pode me banir!');
    }

    // Criar Embed de Confirmação
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirmação de Banimento')
      .setColor(0xe74c3c)
      .setDescription(`Você tem certeza que deseja banir o usuário **${targetUser.tag}** (\`${targetUser.id}\`)?\n\n**Motivo:** ${reason}`)
      .setFooter({ text: `Painel de segurança • Solicitação de ${author.username}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_ban')
        .setLabel('Confirmar Banimento')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔨'),
      new ButtonBuilder()
        .setCustomId('cancel_ban')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✖️')
    );

    const replyMsg = await ctx.reply({
      embeds: [confirmEmbed],
      components: [row],
      fetchReply: true
    });

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000 // 30 segundos para confirmar
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: '❌ Apenas quem executou o comando pode interagir com estes botões.', ephemeral: true });
      }

      if (interaction.customId === 'cancel_ban') {
        const cancelEmbed = new EmbedBuilder()
          .setTitle('❌ Banimento Cancelado')
          .setColor(0x95a5a6)
          .setDescription(`O banimento de **${targetUser.tag}** foi cancelado.`);
        
        await interaction.update({ embeds: [cancelEmbed], components: [] });
        collector.stop();
        return;
      }

      if (interaction.customId === 'confirm_ban') {
        try {
          await ctx.guild.members.ban(targetUser.id, { reason: `Banido por ${author.tag} — Motivo: ${reason}` });

          const successEmbed = new EmbedBuilder()
            .setTitle('🔨 Usuário Banido com Sucesso')
            .setColor(0x2ecc71)
            .setDescription(`O usuário **${targetUser.tag}** foi banido do servidor.\n\n**Motivo:** ${reason}`)
            .setTimestamp();

          await interaction.update({ embeds: [successEmbed], components: [] });
        } catch (err) {
          console.error(err);
          await interaction.update({ content: '❌ Não foi possível banir este usuário. Verifique minhas permissões e se o cargo dele é inferior ao meu.', embeds: [], components: [] });
        }
        collector.stop();
      }
    });

    collector.on('end', async (collected, reasonTime) => {
      if (reasonTime === 'time') {
        try {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏰ Tempo Expirado')
            .setColor(0x7f8c8d)
            .setDescription('O tempo para confirmar o banimento expirou.');
          await replyMsg.edit({ embeds: [timeoutEmbed], components: [] });
        } catch (e) {}
      }
    });
  }
};
