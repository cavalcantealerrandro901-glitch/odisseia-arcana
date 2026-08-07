const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banco')
    .setDescription('Acessa o painel bancário para empréstimos e pagamentos.'),
  name: 'banco',
  description: 'Acessa o painel bancário para empréstimos e pagamentos.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const member = ctx.member;
    const bank = member.bank || 0;
    const debt = member.debt || 0;

    const embed = new EmbedBuilder()
      .setTitle(`🏦 Banco Central — ${author.username}`)
      .setColor('#2F3136')
      .setThumbnail(author.displayAvatarURL({ dynamic: true }))
      .setDescription(`Olá **${author.username}**, seja bem-vindo ao seu painel financeiro!\n\nUtilize os botões abaixo para realizar operações bancárias.`)
      .addFields(
        { name: '🏦 Saldo em Conta', value: `\`$${bank.toLocaleString()}\``, inline: true }
      )
      .setFooter({ text: `Prefixo: ${ctx.prefix || '!'}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`loan_request_${author.id}`)
        .setLabel('💳 Pedir Empréstimo')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`loan_pay_${author.id}`)
        .setLabel('💸 Pagar Dívida')
        .setStyle(ButtonStyle.Success)
        .setDisabled(debt <= 0),
      new ButtonBuilder()
        .setCustomId(`loan_view_${author.id}`)
        .setLabel('📜 Ver Dívida')
        .setStyle(ButtonStyle.Secondary)
    );

    const response = isSlash 
      ? await ctx.reply({ embeds: [embed], components: [row], fetchReply: true })
      : await ctx.reply({ embeds: [embed], components: [row] });

    const collector = response.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: '❌ Você não pode mexer no painel de outro usuário.', ephemeral: true });
      }

      if (interaction.customId.startsWith('loan_view_')) {
        const currentDebt = member.debt || 0;
        const dueDate = member.debtDueDate ? new Date(member.debtDueDate).toLocaleString('pt-BR') : 'Nenhuma dívida ativa';

        const debtEmbed = new EmbedBuilder()
          .setTitle('📜 Informações do Contrato')
          .setColor(currentDebt > 0 ? '#ED4245' : '#57F287')
          .addFields(
            { name: '💰 Dívida Atual', value: `\`$${currentDebt.toLocaleString()}\``, inline: true },
            { name: '⏰ Data de Vencimento', value: `\`${dueDate}\``, inline: true },
            { name: '📊 Regras', value: '• **7%** de taxa inicial.\n• Prazo estendido conforme o valor do valor solicitado.\n• Multa automática de **9,99%** após o vencimento.' }
          );

        return interaction.reply({ embeds: [debtEmbed], ephemeral: true });
      }

      if (interaction.customId.startsWith('loan_request_')) {
        if ((member.debt || 0) > 0) {
          return interaction.reply({ content: '❌ Você já possui uma dívida ativa!', ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId(`modal_loan_${interaction.user.id}`)
          .setTitle('Solicitar Empréstimo Bancário');

        const amountInput = new TextInputBuilder()
          .setCustomId('loan_amount')
          .setLabel('Valor Solicitado')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 200000 (200k = 5 dias)')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
        return interaction.showModal(modal);
      }

      if (interaction.customId.startsWith('loan_pay_')) {
        const modal = new ModalBuilder()
          .setCustomId(`modal_pay_${interaction.user.id}`)
          .setTitle('Pagamento de Dívida');

        const amountInput = new TextInputBuilder()
          .setCustomId('pay_amount')
          .setLabel('Quanto deseja pagar?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Digite o valor ou "tudo"')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
        return interaction.showModal(modal);
      }
    });
  }
};
