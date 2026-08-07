const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'banco',
  aliases: ['bank', 'atm'],
  description: 'Acessa a sua conta bancária, com opções de empréstimo e gestão de dívidas',
  slashData: new SlashCommandBuilder()
    .setName('banco')
    .setDescription('Acessa o painel do seu banco celestial')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Selecione o usuário para consultar')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    let targetUser = message.mentions.users.first() || message.author;
    return exibirPainelBanco(message, targetUser, false);
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    return exibirPainelBanco(interaction, targetUser, true);
  }
};

async function exibirPainelBanco(contexto, targetUser, isSlash = false) {
  const userId = targetUser.id;
  const autor = isSlash ? contexto.user : contexto.author;
  const ehDonoDaConta = autor.id === userId;

  const banco = (await db.get(`banco_${userId}`)) || 0;
  const carteira = (await db.get(`carteira_${userId}`)) || 0;
  const divida = (await db.get(`divida_${userId}`)) || 0;

  const embed = new EmbedBuilder()
    .setAuthor({ 
      name: `Banco Celestial — ${targetUser.globalName || targetUser.username}`, 
      iconURL: targetUser.displayAvatarURL() 
    })
    .setColor('#5865F2')
    .setDescription(
      `🏦 **Saldo no Banco:** \`${banco.toLocaleString('pt-BR')}\` almas\n` +
      `👛 **Saldo em Carteira:** \`${carteira.toLocaleString('pt-BR')}\` almas\n` +
      `⚠️ **Dívida Ativa:** \`${divida.toLocaleString('pt-BR')}\` almas`
    )
    .setFooter({ text: `Solicitado por ${autor.username}`, iconURL: autor.displayAvatarURL() })
    .setTimestamp();

  // Se estiver vendo a conta de outro usuário, mostra só a embed sem os botões interativos
  if (!ehDonoDaConta) {
    return contexto.reply({ embeds: [embed] });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_emprestimo_${userId}`)
      .setLabel('💰 Pedir Empréstimo')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`btn_pagardivida_${userId}`)
      .setLabel('💳 Pagar Dívida')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`btn_verdivida_${userId}`)
      .setLabel('📊 Ver Dívida')
      .setStyle(ButtonStyle.Secondary)
  );

  const resposta = isSlash
    ? await contexto.reply({ embeds: [embed], components: [row], fetchReply: true })
    : await contexto.reply({ embeds: [embed], components: [row] });

  // Coletor de interações dos botões (ativo por 3 minutos)
  const collector = resposta.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 180000
  });

  collector.on('collect', async interaction => {
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ Você não pode interagir com o painel de outro usuário!', flags: [MessageFlags.Ephemeral] });
    }

    const customId = interaction.customId;

    if (customId.startsWith('btn_verdivida_')) {
      const dividaAtual = (await db.get(`divida_${userId}`)) || 0;
      if (dividaAtual === 0) {
        return interaction.reply({ content: '✅ **Você não possui nenhuma dívida ativa!** Pode pedir empréstimos a qualquer momento.', flags: [MessageFlags.Ephemeral] });
      } else {
        return interaction.reply({ 
          content: `⚠️ **Detalhamento da Dívida:**\nVocê deve \`${dividaAtual.toLocaleString('pt-BR')}\` almas ao Banco Celestial.\nUse o botão de **Pagar Dívida** ou o comando \`O.pagardivida\` para quitar seu débito.`, 
          flags: [MessageFlags.Ephemeral] 
        });
      }
    }

    if (customId.startsWith('btn_emprestimo_')) {
      const dividaAtual = (await db.get(`divida_${userId}`)) || 0;
      if (dividaAtual > 0) {
        return interaction.reply({ 
          content: `❌ **Empréstimo Recusado!** Você possui uma dívida pendente de \`${dividaAtual.toLocaleString('pt-BR')}\` almas. Quite-a antes de solicitar um novo valor.`, 
          flags: [MessageFlags.Ephemeral] 
        });
      }

      // Modal para digitar o valor do empréstimo
      const modal = new ModalBuilder()
        .setCustomId(`modal_emp_${userId}`)
        .setTitle('💰 Solicitar Empréstimo');

      const inputValor = new TextInputBuilder()
        .setCustomId('valor_emp')
        .setLabel('Quantidade de almas (Máx: 100.000):')
        .setPlaceholder('Ex: 5000')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(inputValor));
      await interaction.showModal(modal);

      // Aguardar submissão do Modal
      try {
        const submitted = await interaction.awaitModalSubmit({ time: 60000, filter: i => i.user.id === userId });
        const valText = submitted.fields.getTextInputValue('valor_emp');
        const valorReq = parseInt(valText);

        if (isNaN(valorReq) || valorReq <= 0 || valorReq > 100000) {
          return submitted.reply({ content: '❌ Valor inválido! O valor máximo permitido é de **100.000 almas**.', flags: [MessageFlags.Ephemeral] });
        }

        const juros = Math.floor(valorReq * 0.10); // 10% de juros
        const dividaTotal = valorReq + juros;

        const cartAtual = (await db.get(`carteira_${userId}`)) || 0;
        await db.set(`carteira_${userId}`, cartAtual + valorReq);
        await db.set(`divida_${userId}`, dividaTotal);

        return submitted.reply({ 
          content: `✅ **Empréstimo Aprovado!**\n💰 Recebido na carteira: \`+${valorReq.toLocaleString('pt-BR')}\` almas\n⚠️ Dívida registrada (com 10% de juros): \`${dividaTotal.toLocaleString('pt-BR')}\` almas`, 
          flags: [MessageFlags.Ephemeral] 
        });
      } catch (err) {
        // Modal expirado sem resposta
      }
    }

    if (customId.startsWith('btn_pagardivida_')) {
      const dividaAtual = (await db.get(`divida_${userId}`)) || 0;
      if (dividaAtual === 0) {
        return interaction.reply({ content: '✅ Você não tem nenhuma dívida para pagar!', flags: [MessageFlags.Ephemeral] });
      }

      const modal = new ModalBuilder()
        .setCustomId(`modal_pag_${userId}`)
        .setTitle('💳 Pagar Dívida');

      const inputValor = new TextInputBuilder()
        .setCustomId('valor_pag')
        .setLabel(`Valor a pagar (Dívida atual: ${dividaAtual}):`)
        .setPlaceholder('Ex: 2000 ou digite "tudo"')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(inputValor));
      await interaction.showModal(modal);

      try {
        const submitted = await interaction.awaitModalSubmit({ time: 60000, filter: i => i.user.id === userId });
        const valText = submitted.fields.getTextInputValue('valor_pag').trim().toLowerCase();
        
        let valorPagamento = 0;
        const cartAtual = (await db.get(`carteira_${userId}`)) || 0;

        if (valText === 'tudo' || valText === 'all') {
          valorPagamento = Math.min(cartAtual, dividaAtual);
        } else {
          valorPagamento = parseInt(valText);
        }

        if (isNaN(valorPagamento) || valorPagamento <= 0) {
          return submitted.reply({ content: '❌ Insira um valor de pagamento válido!', flags: [MessageFlags.Ephemeral] });
        }

        if (cartAtual < valorPagamento) {
          return submitted.reply({ content: `❌ Saldo insuficiente na carteira! Você tem apenas \`${cartAtual.toLocaleString('pt-BR')}\` almas.`, flags: [MessageFlags.Ephemeral] });
        }

        const valorAbatido = Math.min(valorPagamento, dividaAtual);
        const novaDivida = dividaAtual - valorAbatido;

        await db.set(`carteira_${userId}`, cartAtual - valorAbatido);
        await db.set(`divida_${userId}`, novaDivida);

        return submitted.reply({ 
          content: `💳 **Pagamento Realizado!**\n` +
                   `💸 Valor pago: \`${valorAbatido.toLocaleString('pt-BR')}\` almas\n` +
                   (novaDivida === 0 ? '🎉 **Dívida totalmente quitada!**' : `⚠️ Dívida restante: \`${novaDivida.toLocaleString('pt-BR')}\` almas`), 
          flags: [MessageFlags.Ephemeral] 
        });
      } catch (err) {
        // Expirou
      }
    }
  });
}
