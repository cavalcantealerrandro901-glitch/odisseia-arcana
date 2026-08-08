const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limpar')
    .setDescription('Limpa mensagens do canal, contornando o limite de 14 dias (Apenas Moderadores).')
    .addIntegerOption(option =>
      option.setName('quantidade')
        .setDescription('Quantidade de mensagens a apagar (1 a 100)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  name: 'limpar',
  aliases: ['clear', 'purge'],
  category: 'Administração',
  description: 'Limpa mensagens do canal.',
  async execute(ctx, client, isSlash, args = []) {
    let amount;

    if (isSlash) {
      amount = ctx.options.getInteger('quantidade');
      await ctx.deferReply({ ephemeral: true });
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      const errorMsg = '❌ Informe uma quantidade válida de mensagens para apagar (Ex: `!limpar 10` ou `/limpar quantidade:10`).';
      if (isSlash) return ctx.editReply({ content: errorMsg });
      return ctx.reply({ content: errorMsg, ephemeral: true });
    }

    if (amount > 100) amount = 100;

    try {
      const messages = await ctx.channel.messages.fetch({ limit: amount });
      
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      
      const recentMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const oldMessages = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

      let deletedCount = 0;

      if (recentMessages.size > 0) {
        const deleted = await ctx.channel.bulkDelete(recentMessages, true).catch(() => null);
        if (deleted) deletedCount += deleted.size;
      }

      for (const [, msg] of oldMessages) {
        try {
          await msg.delete();
          deletedCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          // Ignora mensagens que falharam ao deletar individualmente
        }
      }

      const replyContent = `🧹 Com sucesso, **${deletedCount}** mensagem(ns) foram apagadas deste canal!`;

      if (isSlash) {
        await ctx.editReply({ content: replyContent });
      } else {
        const msg = await ctx.reply({ content: replyContent });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        await ctx.delete().catch(() => {});
      }

    } catch (err) {
      console.error('Erro ao limpar mensagens:', err);
      const errorMsg = '❌ Ocorreu um erro ao tentar limpar as mensagens deste canal.';
      if (isSlash) {
        if (ctx.deferred) await ctx.editReply({ content: errorMsg });
        else await ctx.reply({ content: errorMsg, ephemeral: true });
      } else {
        await ctx.reply({ content: errorMsg });
      }
    }
  }
};
