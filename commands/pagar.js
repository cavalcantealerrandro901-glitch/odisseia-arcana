const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Comandos de pagamento e transferência.')
    .addSubcommand(sub =>
      sub
        .setName('almas')
        .setDescription('Transfere almas para um ou mais usuários.')
        .addIntegerOption(opt => 
          opt.setName('quantia')
            .setDescription('Quantidade de almas a ser transferida para cada pessoa')
            .setRequired(true)
            .setMinValue(1))
        .addUserOption(opt => 
          opt.setName('usuario1')
            .setDescription('Primeiro usuário a receber as almas')
            .setRequired(true))
        .addUserOption(opt => 
          opt.setName('usuario2')
            .setDescription('Segundo usuário (opcional)')
            .setRequired(false))
        .addUserOption(opt => 
          opt.setName('usuario3')
            .setDescription('Terceiro usuário (opcional)')
            .setRequired(false))
    ),
  name: 'pagar',
  aliases: ['pix', 'pay', 'pai'],
  description: 'Transfere almas via /pagar almas, !pix ou !pay',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    let targets = [];
    let amount = 0;

    if (isSlash) {
      const subcommand = ctx.options.getSubcommand();
      if (subcommand !== 'almas') return;

      amount = ctx.options.getInteger('quantia');
      const u1 = ctx.options.getUser('usuario1');
      const u2 = ctx.options.getUser('usuario2');
      const u3 = ctx.options.getUser('usuario3');

      if (u1) targets.push(u1);
      if (u2) targets.push(u2);
      if (u3) targets.push(u3);
    } else {
      // Prefixo: !pix, !pay ou !pai
      amount = parseInt(args.find(a => !isNaN(a) && !a.includes('<@')), 10);
      
      if (ctx.mentions && ctx.mentions.users.size > 0) {
        targets = Array.from(ctx.mentions.users.values());
      }

      if (!amount || isNaN(amount) || amount <= 0 || targets.length === 0) {
        return ctx.reply('❌ **Uso correto:** `!pix <quantia> @usuario1 [@usuario2...]` ou `!pay <quantia> @usuario`');
      }
    }

    // Filtrar bots e duplicatas
    targets = targets.filter((u, index, self) => !u.bot && self.findIndex(t => t.id === u.id) === index);

    if (targets.length === 0) {
      return ctx.reply('❌ Você precisa marcar pelo menos um usuário válido.');
    }

    if (targets.some(u => u.id === author.id)) {
      return ctx.reply('❌ Você não pode transferir almas para você mesmo!');
    }

    const totalCost = amount * targets.length;

    const UserModel = mongoose.models.User || mongoose.model('User');
    let senderData = await UserModel.findOne({ userId: author.id });
    if (!senderData) senderData = new UserModel({ userId: author.id });

    if ((senderData.souls || 0) < totalCost) {
      return ctx.reply(`❌ **Almas Insuficientes!** Você precisa de 🔮 **${totalCost.toLocaleString()} almas** para enviar **${amount.toLocaleString()} almas** para ${targets.length} pessoa(s), mas possui apenas 🔮 **${(senderData.souls || 0).toLocaleString()} almas**.`);
    }

    // Pessoas necessárias para confirmar (Remetente + Destinatários)
    const requiredConfirmations = new Set([author.id, ...targets.map(t => t.id)]);
    const confirmedUsers = new Set();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accept_soul_transfer')
        .setLabel('✅ Aceitar Transferência')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel_soul_transfer')
        .setLabel('❌ Cancelar')
        .setStyle(ButtonStyle.Danger)
    );

    const targetMentions = targets.map(t => `<@${t.id}>`).join(', ');

    const initialText = `🔮 **TRANSFERÊNCIA DE ALMAS INICIADA!**\n\n` +
      `O usuário <@${author.id}> está prestes a transferir 🔮 **${amount.toLocaleString()} almas** para cada um dos seguintes usuários: ${targetMentions}.\n` +
      `*(Custo total para o remetente: 🔮 **${totalCost.toLocaleString()} almas**)*\n\n` +
      `📜 **REGRAS E CONSEQUÊNCIAS:**\n` +
      `• Esta ação é **permanente e irreversível** após a confirmação de todos.\n` +
      `• Transferências fraudulentas ou suspeitas podem resultar em sanções no servidor.\n` +
      `• **Todos os envolvidos** (<@${author.id}> e os destinatários) precisam clicar no botão **Aceitar** para concluir.\n\n` +
      `⏳ *Aguardando confirmações (0/${requiredConfirmations.size})...*`;

    const initialMsg = await ctx.reply({
      content: initialText,
      components: [row],
      fetchReply: true
    });

    const collector = initialMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 
    });

    collector.on('collect', async (interaction) => {
      if (!requiredConfirmations.has(interaction.user.id)) {
        return interaction.reply({
          content: '❌ Você não faz parte desta transferência de almas!',
          ephemeral: true
        });
      }

      if (interaction.customId === 'cancel_soul_transfer') {
        collector.stop('cancelled');
        return interaction.reply({
          content: `❌ A transferência de almas foi cancelada por <@${interaction.user.id}>.`,
          ephemeral: false
        });
      }

      if (interaction.customId === 'accept_soul_transfer') {
        if (confirmedUsers.has(interaction.user.id)) {
          return interaction.reply({
            content: '⚠️ Você já aceitou esta transferência! Aguardando os demais.',
            ephemeral: true
          });
        }

        confirmedUsers.add(interaction.user.id);
        await interaction.deferUpdate();

        if (confirmedUsers.size < requiredConfirmations.size) {
          const pendingMentions = Array.from(requiredConfirmations)
            .filter(id => !confirmedUsers.has(id))
            .map(id => `<@${id}>`)
            .join(', ');

          await initialMsg.edit({
            content: initialText + `\n\n📌 **Falta a confirmação de:** ${pendingMentions}`
          });
        } else {
          collector.stop('completed');
        }
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'completed') {
        let freshSender = await UserModel.findOne({ userId: author.id });
        if (!freshSender || (freshSender.souls || 0) < totalCost) {
          return initialMsg.edit({
            content: '❌ **Erro:** O remetente não possui mais almas suficientes para concluir a transferência!',
            components: []
          });
        }

        // Descontar do remetente
        freshSender.souls -= totalCost;
        await freshSender.save();

        // Adicionar aos destinatários
        for (const target of targets) {
          let tData = await UserModel.findOne({ userId: target.id });
          if (!tData) tData = new UserModel({ userId: target.id });
          tData.souls = (tData.souls || 0) + amount;
          await tData.save();
        }

        // Ranks baseados no total de almas
        const allUsers = await UserModel.find().sort({ souls: -1 });
        const getRank = (uId) => {
          const idx = allUsers.findIndex(u => u.userId === uId);
          return idx !== -1 ? `#${idx + 1}` : '#?';
        };

        const senderRank = getRank(author.id);
        const senderSouls = freshSender.souls;

        let resultText = `✅ **TRANSFERÊNCIA DE ALMAS CONCLUÍDA COM SUCESSO!**\n\n` +
          `O usuário <@${author.id}> transferiu 🔮 **${amount.toLocaleString()} almas** para cada destinatário (Total: 🔮 **${totalCost.toLocaleString()} almas**).\n` +
          `📊 <@${author.id}> agora possui 🔮 **${senderSouls.toLocaleString()} almas** e está no **Rank ${senderRank} de Almas** do servidor.\n\n` +
          `--- **Destinatários:** ---\n`;

        for (const target of targets) {
          const tData = await UserModel.findOne({ userId: target.id });
          const tSouls = tData ? tData.souls : 0;
          const tRank = getRank(target.id);
          resultText += `• O usuário <@${target.id}> recebeu 🔮 **${amount.toLocaleString()} almas**, agora possui 🔮 **${tSouls.toLocaleString()} almas** e está no **Rank ${tRank} de Almas** do servidor.\n`;
        }

        await initialMsg.edit({
          content: resultText,
          components: []
        });

      } else if (reason !== 'cancelled') {
        await initialMsg.edit({
          content: '⏰ **Tempo Esgotado!** A transferência de almas foi cancelada pois nem todos confirmaram a tempo.',
          components: []
        });
      }
    });
  }
};
