const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'pay',
  aliases: ['pagar', 'transferir', 'pix', 'doar'],
  description: 'Transfere uma quantidade de almas da sua carteira para uma ou mais pessoas',
  slashData: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfere almas da sua carteira para um usuário')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Selecione o usuário para transferir')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade de almas a transferir')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('mensagem')
        .setDescription('Mensagem individual opcional para o destinatário')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    // Filtrar menções de usuários válidos (ignora bots e o próprio autor)
    const mencoes = message.mentions.users.filter(u => !u.bot && u.id !== message.author.id);
    
    if (mencoes.size === 0) {
      return message.reply('⚠️ Você precisa mencionar pelo menos um usuário válido para transferir!\nExemplo: `O.pay 100 @Usuario1 @Usuario2 Obrigado pela ajuda!`');
    }

    // Identificar a quantidade no comando
    const argQuant = args.find(a => !isNaN(a) && parseInt(a) > 0);
    if (!argQuant) {
      return message.reply('⚠️ Informe uma quantidade válida de almas para transferir!\nExemplo: `O.pay 100 @Usuario1 @Usuario2`');
    }

    const quantiaPorPessoa = parseInt(argQuant);

    // Extrair a mensagem personalizada (removendo as menções e a quantidade do texto)
    const mensagemAnexo = args
      .filter(a => isNaN(a) || parseInt(a) <= 0)
      .filter(a => !a.startsWith('<@') && !a.endsWith('>'))
      .join(' ')
      .trim();

    return processarPagamento(message, message.author, Array.from(mencoes.values()), quantiaPorPessoa, mensagemAnexo, false);
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('usuario');
    const quantia = interaction.options.getInteger('quantidade');
    const mensagemAnexo = interaction.options.getString('mensagem') || '';

    if (targetUser.bot || targetUser.id === interaction.user.id) {
      return interaction.reply({ 
        content: '❌ Você não pode transferir almas para si mesmo ou para um bot!', 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    return processarPagamento(interaction, interaction.user, [targetUser], quantia, mensagemAnexo, true);
  }
};

async function processarPagamento(contexto, pagador, destinatarios, quantiaPorPessoa, mensagemAnexo, isSlash = false) {
  const pagadorId = pagador.id;
  const saldoCarteira = (await db.get(`carteira_${pagadorId}`)) || 0;
  const totalNecessario = quantiaPorPessoa * destinatarios.length;

  if (saldoCarteira < totalNecessario) {
    const msgErro = `❌ **Saldo insuficiente!** Você precisa de \`${totalNecessario.toLocaleString('pt-BR')}\` almas na carteira para pagar **${destinatarios.length}** pessoa(s) (\`${quantiaPorPessoa.toLocaleString('pt-BR')}\` para cada), mas possui apenas \`${saldoCarteira.toLocaleString('pt-BR')}\` almas.`;
    return isSlash 
      ? contexto.reply({ content: msgErro, flags: [MessageFlags.Ephemeral] }) 
      : contexto.reply(msgErro);
  }

  // Descontar saldo total do pagador
  await db.set(`carteira_${pagadorId}`, saldoCarteira - totalNecessario);

  const resumoTransferencias = [];

  for (const destinatario of destinatarios) {
    const destId = destinatario.id;
    const saldoDest = (await db.get(`carteira_${destId}`)) || 0;
    
    // Adicionar saldo para cada destinatário
    await db.set(`carteira_${destId}`, saldoDest + quantiaPorPessoa);

    resumoTransferencias.push(`• ${destinatario}: \`+${quantiaPorPessoa.toLocaleString('pt-BR')}\` almas`);

    // Enviar notificação individual no PV (DM) de cada destinatário
    try {
      const embedDM = new EmbedBuilder()
        .setTitle('💸 Você recebeu uma transferência!')
        .setDescription(`**${pagador.globalName || pagador.username}** lhe enviou \`${quantiaPorPessoa.toLocaleString('pt-BR')}\` almas!`)
        .setColor('#00FFA3')
        .setTimestamp();

      if (mensagemAnexo) {
        embedDM.addFields({ name: '💬 Mensagem do Remetente:', value: `*"${mensagemAnexo}"*` });
      }

      await destinatario.send({ embeds: [embedDM] });
    } catch (err) {
      // Se a DM do usuário estiver fechada, ignora o erro
    }
  }

  const embedResposta = new EmbedBuilder()
    .setTitle('✅ Transferência Realizada com Sucesso!')
    .setColor('#00FFA3')
    .setAuthor({ name: pagador.globalName || pagador.username, iconURL: pagador.displayAvatarURL() })
    .setDescription(
      `**Valor por pessoa:** \`${quantiaPorPessoa.toLocaleString('pt-BR')}\` almas\n` +
      `**Total enviado:** \`${totalNecessario.toLocaleString('pt-BR')}\` almas\n` +
      `**Novo saldo na carteira:** \`${(saldoCarteira - totalNecessario).toLocaleString('pt-BR')}\` almas\n\n` +
      `**Destinatários:**\n${resumoTransferencias.join('\n')}` +
      (mensagemAnexo ? `\n\n💬 **Mensagem enviada:** *"${mensagemAnexo}"*` : '')
    )
    .setFooter({ text: 'Notificação enviada no PV de cada membro (caso a DM esteja aberta).' })
    .setTimestamp();

  if (isSlash) {
    return contexto.reply({ embeds: [embedResposta] });
  } else {
    return contexto.reply({ embeds: [embedResposta] });
  }
}
