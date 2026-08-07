const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

const CARGOS_DIVINOS = [
  'Mortal Aprendiz',
  'Guerreiro Celestial',
  'Senhor do Olimpo',
  'Titã Inabalável',
  'Guardião do Vazio',
  'Arconte das Estrelas',
  'Entidade Primordial',
  'Soberano do Multiverso',
  'Deus Absurdo do Aeternus'
];

function parseAmount(input, walletBalance) {
  if (!input) return null;
  const str = input.toString().toLowerCase().trim();

  if (str === 'all' || str === 'tudo') return walletBalance;
  if (str === 'half' || str === 'metade') return Math.floor(walletBalance / 2);

  let multiplier = 1;
  let cleanStr = str;

  if (cleanStr.endsWith('k')) {
    multiplier = 1000;
    cleanStr = cleanStr.slice(0, -1);
  } else if (cleanStr.endsWith('m')) {
    multiplier = 1000000;
    cleanStr = cleanStr.slice(0, -1);
  } else if (cleanStr.endsWith('b')) {
    multiplier = 1000000000;
    cleanStr = cleanStr.slice(0, -1);
  }

  if (multiplier > 1) {
    cleanStr = cleanStr.replace(',', '.');
  } else {
    cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(cleanStr);
  if (isNaN(num) || num <= 0) return null;

  return Math.floor(num * multiplier);
}

async function getRankName(userId) {
  let rankIndex = (await db.get(`work_rank_${userId}`)) || 0;
  if (rankIndex >= CARGOS_DIVINOS.length) rankIndex = CARGOS_DIVINOS.length - 1;
  return CARGOS_DIVINOS[rankIndex];
}

module.exports = {
  name: 'pay',
  aliases: ['pix', 'pagar'],
  description: 'Transfira almas para outro usuário com confirmação dupla',
  slashData: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfira almas para outro membro com segurança')
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro que receberá a transferência').setRequired(true))
    .addStringOption(opt => opt.setName('quantia').setDescription('Quantidade (ex: 10k, 1.5m, half, all)').setRequired(true)),

  async execute(message, args, client) {
    const remetente = message.author;
    const mencao = message.mentions.users.first();
    const argQuantia = args[1];

    if (!mencao || !argQuantia) {
      return message.reply('Uso incorreto! Sintaxe: `O.pay @usuario <quantia>` (Ex: `O.pay @user 50k`, `O.pay @user half`)');
    }

    return iniciarPay(message, remetente, mencao, argQuantia);
  },

  async executeSlash(interaction, client) {
    const remetente = interaction.user;
    const destinatario = interaction.options.getUser('usuario');
    const argQuantia = interaction.options.getString('quantia');

    return iniciarPay(interaction, remetente, destinatario, argQuantia, true);
  }
};

async function iniciarPay(contexto, remetente, destinatario, argQuantia, isSlash = false) {
  if (destinatario.id === remetente.id) {
    const msg = 'Operação negada! Você não pode transferir almas para si mesmo.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  if (destinatario.bot) {
    const msg = 'Operação negada! Não é possível transferir almas para bots.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const carteiraRemetente = (await db.get(`carteira_${remetente.id}`)) || 0;
  const valor = parseAmount(argQuantia, carteiraRemetente);

  if (!valor || valor <= 0) {
    const msg = 'Quantia inválida! Use números válidos ou atalhos como `50k`, `1.5m`, `half` ou `all`.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  if (carteiraRemetente < valor) {
    const msg = `Saldo insuficiente! Sua carteira possui apenas \`${carteiraRemetente.toLocaleString('pt-BR')}\` almas.`;
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const textoAviso = 
    `**TRANSAÇÃO CÓSMICA EM ANDAMENTO — AETERNUS**\n` +
    `**Remetente:** <@${remetente.id}> | **Destinatário:** <@${destinatario.id}> | **Valor:** \`${valor.toLocaleString('pt-BR')}\` almas\n` +
    `**REGRAS E RISCOS:** Transações são irreversíveis após concluídas. Verifique o destinatário e valor. Ambas as partes devem autorizar. Expira em 6 minutos.\n` +
    `*Aguardando confirmação de ambos os usuários...*`;

  const botaoConfirmar = new ButtonBuilder()
    .setCustomId('confirmar_pay')
    .setLabel('Confirmar Transferência (0/2)')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(botaoConfirmar);

  const mensagemCriada = isSlash 
    ? await contexto.reply({ content: textoAviso, components: [row], fetchReply: true })
    : await contexto.reply({ content: textoAviso, components: [row] });

  const confirmacoes = new Set();

  const collector = mensagemCriada.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 6 * 60 * 1000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== remetente.id && interaction.user.id !== destinatario.id) {
      return interaction.reply({ content: 'Você não participa desta transação!', ephemeral: true });
    }

    if (confirmacoes.has(interaction.user.id)) {
      return interaction.reply({ content: 'Você já confirmou sua parte! Aguardando o outro participante.', ephemeral: true });
    }

    confirmacoes.add(interaction.user.id);

    if (confirmacoes.size === 1) {
      botaoConfirmar.setLabel('Confirmar Transferência (1/2)');
      const rowAtualizada = new ActionRowBuilder().addComponents(botaoConfirmar);

      await interaction.update({
        content: textoAviso + `\n<@${interaction.user.id}> confirmou a transação! Faltando o outro participante.`,
        components: [rowAtualizada]
      });
    } else if (confirmacoes.size === 2) {
      collector.stop('sucesso');

      const carteiraAtualRemetente = (await db.get(`carteira_${remetente.id}`)) || 0;
      if (carteiraAtualRemetente < valor) {
        botaoConfirmar.setDisabled(true).setLabel('Transferência Cancelada!').setStyle(ButtonStyle.Danger);
        const rowInativa = new ActionRowBuilder().addComponents(botaoConfirmar);

        return interaction.update({
          content: `TRANSFERÊNCIA CANCELADA! <@${remetente.id}> não possui mais saldo suficiente na carteira.`,
          components: [rowInativa]
        });
      }

      const carteiraAtualDestinatario = (await db.get(`carteira_${destinatario.id}`)) || 0;

      const novaCarteiraRemetente = carteiraAtualRemetente - valor;
      const novaCarteiraDestinatario = carteiraAtualDestinatario + valor;

      await db.set(`carteira_${remetente.id}`, novaCarteiraRemetente);
      await db.set(`carteira_${destinatario.id}`, novaCarteiraDestinatario);

      const rankRemetente = await getRankName(remetente.id);
      const rankDestinatario = await getRankName(destinatario.id);

      const bancoRemetente = (await db.get(`banco_${remetente.id}`)) || 0;
      const bancoDestinatario = (await db.get(`banco_${destinatario.id}`)) || 0;

      const totalRemetente = novaCarteiraRemetente + bancoRemetente;
      const totalDestinatario = novaCarteiraDestinatario + bancoDestinatario;

      botaoConfirmar.setDisabled(true).setLabel('Transferência Concluída (2/2)').setStyle(ButtonStyle.Success);
      const rowSucesso = new ActionRowBuilder().addComponents(botaoConfirmar);

      await interaction.update({
        content: `PACTO CONCLUÍDO COM SUCESSO! (2/2)`,
        components: [rowSucesso]
      });

      const textoFinal = 
        `TRANSFERÊNCIA CÓSMICA REALIZADA COM SUCESSO!\n\n` +
        `O usuário <@${remetente.id}> transferiu \`${valor.toLocaleString('pt-BR')}\` almas para <@${destinatario.id}>!\n\n` +
        `<@${remetente.id}>:\n` +
        `• Novo Saldo na Carteira: \`${novaCarteiraRemetente.toLocaleString('pt-BR')}\` almas (Total Geral: ${totalRemetente.toLocaleString('pt-BR')})\n` +
        `• Rank Divino: ${rankRemetente}\n\n` +
        `<@${destinatario.id}>:\n` +
        `• Novo Saldo na Carteira: \`${novaCarteiraDestinatario.toLocaleString('pt-BR')}\` almas (Total Geral: ${totalDestinatario.toLocaleString('pt-BR')})\n` +
        `• Rank Divino: ${rankDestinatario}`;

      if (isSlash) {
        await contexto.followUp({ content: textoFinal });
      } else {
        await mensagemCriada.reply({ content: textoFinal });
      }
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason !== 'sucesso') {
      botaoConfirmar.setDisabled(true).setLabel('Transferência Expirada!').setStyle(ButtonStyle.Danger);
      const rowExpirada = new ActionRowBuilder().addComponents(botaoConfirmar);

      const textoExpirado = 
        `TRANSFERÊNCIA EXPIRADA!\n` +
        `A transferência de \`${valor.toLocaleString('pt-BR')}\` almas entre <@${remetente.id}> e <@${destinatario.id}> foi cancelada pois o tempo limite de 6 minutos expirou sem a confirmação de ambos.`;

      mensagemCriada.edit({ content: textoExpirado, components: [rowExpirada] }).catch(() => {});
    }
  });
}
