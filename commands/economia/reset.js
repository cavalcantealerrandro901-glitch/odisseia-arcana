const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

/**
 * Converte strings formatadas (1k, 1.5m, 2b, 1t) em números inteiros.
 */
function parseAmount(str) {
  if (str === null || str === undefined) return null;
  const match = str.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmbt]?)$/);
  if (!match) return null;

  let value = parseFloat(match[1]);
  const multiplier = match[2];

  switch (multiplier) {
    case 'k': value *= 1e3; break;
    case 'm': value *= 1e6; break;
    case 'b': value *= 1e9; break;
    case 't': value *= 1e12; break;
  }

  return Math.floor(value);
}

module.exports = {
  name: 'reset',
  aliases: ['resetar', 'setmoney', 'setar'],
  description: 'Reseta ou define o saldo de um usuário (aceita 1k, 1m, 1b, etc)',
  slashData: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reseta ou define o saldo de um usuário')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuário que terá o saldo alterado')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('valor')
        .setDescription('Novo valor do saldo (ex: 0, 100, 1k, 1.5m, 2b)')
        .setRequired(false)
    ),

  async execute(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Você precisa da permissão de **Administrador** para usar este comando!');
    }

    const target = message.mentions.users.first();
    if (!target) {
      return message.reply(`❌ Mencione quem terá o saldo alterado! Exemplo: \`${prefix}reset @membro 1k\``);
    }

    const inputValor = args[1] || '0';
    const novoValor = parseAmount(inputValor);

    if (novoValor === null || isNaN(novoValor) || novoValor < 0) {
      return message.reply('❌ Digite um valor válido! Ex: `0`, `100`, `1k`, `1.5m`, `2b`.');
    }

    return processarReset(message, target, novoValor, false);
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    const inputValor = interaction.options.getString('valor') || '0';
    const novoValor = parseAmount(inputValor);

    if (novoValor === null || isNaN(novoValor) || novoValor < 0) {
      return interaction.reply({ content: '❌ Digite um valor válido! Ex: `0`, `100`, `1k`, `1.5m`, `2b`.', ephemeral: true });
    }

    return processarReset(interaction, target, novoValor, true);
  }
};

async function processarReset(contexto, usuario, novoSaldo, isSlash) {
  try {
    await User.findOneAndUpdate(
      { userId: usuario.id },
      { $set: { money: novoSaldo, wallet: novoSaldo, bank: 0 } },
      { returnDocument: 'after', upsert: true }
    );

    const valorFormatado = novoSaldo.toLocaleString('pt-BR');

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('🔄 Saldo Atualizado!')
      .setDescription(`O saldo de ${usuario} foi definido para **💰 ${valorFormatado}** (\`${novoSaldo}\`).`)
      .setTimestamp();

    const payload = { embeds: [embed] };
    return isSlash ? contexto.reply(payload) : contexto.reply(payload);
  } catch (error) {
    console.error('Erro ao resetar saldo:', error);
    const errorMsg = '❌ Ocorreu um erro ao atualizar o saldo no banco de dados.';
    return isSlash ? contexto.reply({ content: errorMsg, ephemeral: true }) : contexto.reply(errorMsg);
  }
}
