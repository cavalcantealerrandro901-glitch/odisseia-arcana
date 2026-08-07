const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  MessageFlags 
} = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'resetar',
  aliases: ['resetbal', 'reset-saldo', 'clearbal'],
  description: 'Reseta o saldo da carteira e do banco de um usuário específico ou de TODOS os membros',
  slashData: new SlashCommandBuilder()
    .setName('resetar')
    .setDescription('Reseta o saldo de economia de um membro ou de todos os membros')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuário que terá o saldo resetado')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('todos')
        .setDescription('Defina como verdadeiro para zerar o saldo de TODOS do servidor')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Você precisa da permissão de **Administrador** para usar este comando.');
    }

    const usuarioMencionado = message.mentions.users.first();
    const querResetarTodos = args[0]?.toLowerCase() === 'todos';

    if (!usuarioMencionado && !querResetarTodos) {
      return message.reply('⚠️ Especifique o que deseja resetar!\n• Para um membro: `O.resetar @Usuario`\n• Para todos: `O.resetar todos`');
    }

    if (querResetarTodos) {
      return processarResetGeral(message, message.author, false);
    } else {
      return processarResetIndividual(message, message.author, usuarioMencionado, false);
    }
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ Você precisa da permissão de **Administrador** para usar este comando.', 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    const usuario = interaction.options.getUser('usuario');
    const resetarTodos = interaction.options.getBoolean('todos');

    if (!usuario && !resetarTodos) {
      return interaction.reply({ 
        content: '⚠️ Selecione um usuário ou ative a opção `todos: Verdadeiro`.', 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    if (resetarTodos) {
      return processarResetGeral(interaction, interaction.user, true);
    } else {
      return processarResetIndividual(interaction, interaction.user, usuario, true);
    }
  }
};

// 1. Processa o Reset Individual
async function processarResetIndividual(contexto, autor, targetUser, isSlash) {
  const customIdConfirm = `confirm_reset_${autor.id}_${Date.now()}`;
  const customIdCancel = `cancel_reset_${autor.id}_${Date.now()}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customIdConfirm)
      .setLabel('Confirmar Reset')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(customIdCancel)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary)
  );

  const textoMsg = `⚠️ **CONFIRMAÇÃO NECESSÁRIA**\n\nTem certeza de que deseja zerar a carteira e o banco do membro ${targetUser}?`;

  const msgResposta = isSlash
    ? await contexto.reply({ content: textoMsg, components: [row], fetchReply: true })
    : await contexto.reply({ content: textoMsg, components: [row] });

  const collector = msgResposta.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== autor.id) {
      return i.reply({ content: 'Apenas quem executou o comando pode interagir.', flags: [MessageFlags.Ephemeral] });
    }

    if (i.customId === customIdConfirm) {
      await db.delete(`carteira_${targetUser.id}`);
      await db.delete(`banco_${targetUser.id}`);

      await i.update({
        content: `✅ **Sucesso!** O saldo da carteira e do banco de ${targetUser} foram resetados para **0 almas**.`,
        components: []
      });
    } else if (i.customId === customIdCancel) {
      await i.update({
        content: '❌ **Operação cancelada.** Nenhum saldo foi alterado.',
        components: []
      });
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      const msgTimeout = '⏱️ **Tempo esgotado.** O comando de reset foi cancelado automaticamente.';
      if (isSlash) {
        await contexto.editReply({ content: msgTimeout, components: [] }).catch(() => {});
      } else {
        await msgResposta.edit({ content: msgTimeout, components: [] }).catch(() => {});
      }
    }
  });
}

// 2. Processa o Reset Geral de Todos
async function processarResetGeral(contexto, autor, isSlash) {
  const customIdConfirm = `confirm_all_${autor.id}_${Date.now()}`;
  const customIdCancel = `cancel_all_${autor.id}_${Date.now()}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customIdConfirm)
      .setLabel('SIM, ZERAR TUDO')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(customIdCancel)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary)
  );

  const textoMsg = `🚨 **ATENÇÃO MÁXIMA — RESET GERAL DE ECONOMIA** 🚨\n\n` +
    `Você está prestes a **ZERAR OS SALDOS DE TODOS OS USUÁRIOS** do servidor!\n` +
    `Esta ação é irreversível. Deseja realmente continuar?`;

  const msgResposta = isSlash
    ? await contexto.reply({ content: textoMsg, components: [row], fetchReply: true })
    : await contexto.reply({ content: textoMsg, components: [row] });

  const collector = msgResposta.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== autor.id) {
      return i.reply({ content: 'Apenas o administrador que chamou o comando pode confirmar.', flags: [MessageFlags.Ephemeral] });
    }

    if (i.customId === customIdConfirm) {
      const todosDados = await db.all();
      let registrosApagados = 0;

      if (Array.isArray(todosDados)) {
        for (const item of todosDados) {
          if (item?.key && typeof item.key === 'string' && (item.key.startsWith('carteira_') || item.key.startsWith('banco_'))) {
            await db.delete(item.key);
            registrosApagados++;
          }
        }
      }

      await i.update({
        content: `💥 **ECONOMIA ZERADA!** Foram removidos **${registrosApagados}** registros de saldos e bancos de todos os membros.`,
        components: []
      });
    } else if (i.customId === customIdCancel) {
      await i.update({
        content: '❌ **Reset geral cancelado.** Nenhum saldo foi alterado.',
        components: []
      });
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      const msgTimeout = '⏱️ **Tempo esgotado.** O reset geral foi cancelado por inatividade.';
      if (isSlash) {
        await contexto.editReply({ content: msgTimeout, components: [] }).catch(() => {});
      } else {
        await msgResposta.edit({ content: msgTimeout, components: [] }).catch(() => {});
      }
    }
  });
}
