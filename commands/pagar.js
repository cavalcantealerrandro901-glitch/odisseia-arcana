const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const mongoose = require('mongoose');

// Função para converter strings como 2.5K, 2.5M, 1B, 5.360.25M em números inteiros
function parseAmount(input) {
  if (!input) return NaN;
  let str = input.toString().trim().toLowerCase();

  const multipliers = {
    'k': 1e3,
    'm': 1e6,
    'b': 1e9,
    't': 1e12
  };

  const lastChar = str.slice(-1);
  let multiplier = 1;

  if (multipliers[lastChar]) {
    multiplier = multipliers[lastChar];
    str = str.slice(0, -1).trim();
  }

  // Tratamento de vírgulas e pontos
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  } else {
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      str = str.replace(/\./g, '');
    }
  }

  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return NaN;

  return Math.floor(num * multiplier);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Comandos de pagamento e transferência.')
    .addSubcommand(sub =>
      sub
        .setName('almas')
        .setDescription('Transfere almas para um ou mais usuários.')
        .addStringOption(opt => 
          opt.setName('quantia')
            .setDescription('Quantidade de almas (ex: 200k, 2.5M, 1B, 50000)')
            .setRequired(true))
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
        .addUserOption(opt => 
          opt.setName('usuario4')
            .setDescription('Quarto usuário (opcional)')
            .setRequired(false))
        .addUserOption(opt => 
          opt.setName('usuario5')
            .setDescription('Quinto usuário (opcional)')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('tempo')
            .setDescription('Tempo limite para aceitar (Padrão: 15m, Máximo: 7d)')
            .setRequired(false)
            .addChoices(
              { name: '15 Minutos',
  category: 'Geral', value: '15m' },
              { name: '1 Hora', value: '1h' },
              { name: '1 Dia', value: '1d' },
              { name: '5 Dias', value: '5d' },
              { name: '7 Dias (Máximo)', value: '7d' }
            ))
        .addBooleanOption(opt =>
          opt.setName('confirmacao_automatica')
            .setDescription('Aceitar automaticamente da sua parte como remetente (true/false)')
            .setRequired(false))
    ),
  name: 'pagar',
  aliases: ['pix', 'pay', 'pai'],
  description: 'Transfere almas via /pagar almas, !pix, !pay ou !pai',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const channel = ctx.channel;
    let targets = [];
    let amount = 0;
    let timeChoice = '15m';
    let autoAccept = false;

    if (isSlash) {
      const subcommand = ctx.options.getSubcommand();
      if (subcommand !== 'almas') return;

      const rawAmount = ctx.options.getString('quantia');
      amount = parseAmount(rawAmount);

      for (let i = 1; i <= 5; i++) {
        const u = ctx.options.getUser(`usuario${i}`);
        if (u) targets.push(u);
      }

      timeChoice = ctx.options.getString('tempo') || '15m';
      autoAccept = ctx.options.getBoolean('confirmacao_automatica') || false;
    } else {
      // Prefixo: !pix 2.5M @user1 @user2 1h auto
      if (ctx.mentions && ctx.mentions.users.size > 0) {
        targets = Array.from(ctx.mentions.users.values());
      }

      const timeArg = args.find(a => ['15m', '1h', '1d', '5d', '7d'].includes(a.toLowerCase()));
      if (timeArg) timeChoice = timeArg.toLowerCase();

      if (args.some(a => ['auto', 'automatico', 'sim', 'true'].includes(a.toLowerCase()))) {
        autoAccept = true;
      }

      // Buscar o argumento da quantia
      for (const arg of args) {
        if (arg.startsWith('<@') || ['15m', '1h', '1d', '5d', '7d', 'auto', 'automatico', 'sim', 'true'].includes(arg.toLowerCase())) {
          continue;
        }
        const parsed = parseAmount(arg);
        if (!isNaN(parsed) && parsed > 0) {
          amount = parsed;
          break;
        }
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ **Quantia inválida!** Use formatos como `200k`, `2.5M`, `1B`, `5000` etc.');
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

    const timeMap = {
      '15m': { ms: 15 * 60 * 1000, label: '15 minutos' },
      '1h': { ms: 60 * 60 * 1000, label: '1 hora' },
      '1d': { ms: 24 * 60 * 60 * 1000, label: '1 dia' },
      '5d': { ms: 5 * 24 * 60 * 60 * 1000, label: '5 dias' },
      '7d': { ms: 7 * 24 * 60 * 60 * 1000, label: '7 dias' }
    };

    const timeInfo = timeMap[timeChoice] || timeMap['15m'];

    if (targets.length > 1) {
      await ctx.reply(`🔮 **PROCESSO DE TRANSFERÊNCIA MÚLTIPLA INICIADO!**\n\n` +
        `• Remetente: <@${author.id}>\n` +
        `• Valor por pessoa: 🔮 **${amount.toLocaleString()} almas**\n` +
        `• Total reservado: 🔮 **${totalCost.toLocaleString()} almas** (${targets.length} destinatários)\n` +
        `• Confirmação automática do remetente: **${autoAccept ? 'Ativada ✅' : 'Desativada ❌'}**\n` +
        `• Tempo limite: **${timeInfo.label}**\n\n` +
        `📩 *Gerando mensagens de confirmação dedicadas para cada usuário abaixo...*`);
    }

    // Criar mensagem dedicada para CADA destinatário
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const confirmedUsers = new Set();
      if (autoAccept) confirmedUsers.add(author.id);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_soul_${author.id}_${target.id}`)
          .setLabel('✅ Aceitar Transferência')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`cancel_soul_${author.id}_${target.id}`)
          .setLabel('❌ Cancelar')
          .setStyle(ButtonStyle.Danger)
      );

      const renderDedicatedText = () => {
        const senderStatus = confirmedUsers.has(author.id) ? '✅ **Aceitou**' : '⏳ **Pendente**';
        const targetStatus = confirmedUsers.has(target.id) ? '✅ **Aceitou**' : '⏳ **Pendente**';

        return `🔮 **TRANSFERÊNCIA DEDICADA DE ALMAS**\n\n` +
          `O usuário <@${author.id}> está prestes a transferir 🔮 **${amount.toLocaleString()} almas** para <@${target.id}>.\n\n` +
          `📜 **REGRAS E CONSEQUÊNCIAS:**\n` +
          `• Esta ação é **permanente e irreversível** após a confirmação de ambos.\n` +
          `• Transferências fraudulentas ou suspeitas podem resultar em sanções no servidor.\n` +
          `• **Ambas as partes** (<@${author.id}> e <@${target.id}>) precisam aceitar para concluir.\n\n` +
          `📋 **STATUS DE CONFIRMAÇÃO:**\n` +
          `• Remetente (<@${author.id}>): ${senderStatus}${autoAccept ? ' *(Automático)*' : ''}\n` +
          `• Destinatário (<@${target.id}>): ${targetStatus}\n\n` +
          `⏰ **Tempo limite:** ${timeInfo.label}\n` +
          `⏳ *Aguardando confirmação (${confirmedUsers.size}/2)...*`;
      };

      let targetMsg;
      if (targets.length === 1) {
        targetMsg = await ctx.reply({
          content: renderDedicatedText(),
          components: [row],
          fetchReply: true
        });
      } else {
        targetMsg = await channel.send({
          content: renderDedicatedText(),
          components: [row]
        });
      }

      const collector = targetMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: timeInfo.ms
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== author.id && interaction.user.id !== target.id) {
          return interaction.reply({
            content: '❌ Você não faz parte desta transferência específica!',
            ephemeral: true
          });
        }

        if (interaction.customId.startsWith('cancel_soul_')) {
          collector.stop('cancelled');
          return interaction.reply({
            content: `❌ A transferência de almas para <@${target.id}> foi cancelada por <@${interaction.user.id}>.`,
            ephemeral: false
          });
        }

        if (interaction.customId.startsWith('accept_soul_')) {
          if (confirmedUsers.has(interaction.user.id)) {
            return interaction.reply({
              content: '⚠️ Você já aceitou esta transferência! Aguardando a outra parte.',
              ephemeral: true
            });
          }

          confirmedUsers.add(interaction.user.id);
          await interaction.deferUpdate();

          if (confirmedUsers.size < 2) {
            await targetMsg.edit({ content: renderDedicatedText() });
          } else {
            collector.stop('completed');
          }
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason === 'completed') {
          let freshSender = await UserModel.findOne({ userId: author.id });
          if (!freshSender || (freshSender.souls || 0) < amount) {
            return targetMsg.edit({
              content: `❌ **Erro:** O remetente <@${author.id}> não possui mais 🔮 **${amount.toLocaleString()} almas** suficientes para concluir esta transferência.`,
              components: []
            });
          }

          // Descontar do remetente
          freshSender.souls -= amount;
          await freshSender.save();

          // Adicionar ao destinatário
          let tData = await UserModel.findOne({ userId: target.id });
          if (!tData) tData = new UserModel({ userId: target.id });
          tData.souls = (tData.souls || 0) + amount;
          await tData.save();

          // Ranks do Servidor
          const allUsers = await UserModel.find().sort({ souls: -1 });
          const getRank = (uId) => {
            const idx = allUsers.findIndex(u => u.userId === uId);
            return idx !== -1 ? `#${idx + 1}` : '#?';
          };

          const senderRank = getRank(author.id);
          const targetRank = getRank(target.id);

          const resultText = `✅ **TRANSFERÊNCIA DE ALMAS CONCLUÍDA COM SUCESSO!**\n\n` +
            `O usuário <@${author.id}> transferiu 🔮 **${amount.toLocaleString()} almas** para <@${target.id}>.\n\n` +
            `📊 **STATUS ATUALIZADO DOS ENVOLVIDOS:**\n` +
            `• Remetente (<@${author.id}>): agora possui 🔮 **${freshSender.souls.toLocaleString()} almas** e está no **Rank ${senderRank} de Almas** do servidor.\n` +
            `• Destinatário (<@${target.id}>): recebeu 🔮 **${amount.toLocaleString()} almas**, agora possui 🔮 **${tData.souls.toLocaleString()} almas** e está no **Rank ${targetRank} de Almas** do servidor.`;

          await targetMsg.edit({
            content: resultText,
            components: []
          });

        } else if (reason !== 'cancelled') {
          await targetMsg.edit({
            content: `⏰ **Tempo Esgotado!** A transferência de almas para <@${target.id}> expirou pois nem todas as partes aceitaram dentro de ${timeInfo.label}.`,
            components: []
          });
        }
      });
    }
  }
};
