const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  SlashCommandBuilder 
} = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/warns.json' });

module.exports = {
  name: 'unwarn',
  aliases: ['removeraviso', 'removeradvertencia'],
  description: 'Remove uma quantidade de advertências de um membro',
  slashData: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove uma quantidade de advertências de um membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro para remover o aviso')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantidade')
        .setDescription('Quantidade de avisos a remover (padrão: 1)')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply('❓ Por favor, mencione um membro ou forneça um ID válido.');

    const quantidade = parseInt(args[1]) || 1;
    return removerWarns(message, target, quantidade, message.author);
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const target = interaction.options.getMember('usuario');
    if (!target) return interaction.reply({ content: '❓ Membro não encontrado.', ephemeral: true });

    const quantidade = interaction.options.getInteger('quantidade') || 1;
    return removerWarns(interaction, target, quantidade, interaction.user, true);
  }
};

async function removerWarns(contexto, target, qtdRemover, autor, isSlash = false) {
  const chave = `warns_${contexto.guild.id}_${target.id}`;
  const avisosAtuais = (await db.get(chave)) || 0;

  if (avisosAtuais === 0) {
    const msg = 'ℹ️ Este membro não possui advertências cadastradas.';
    return isSlash ? contexto.reply({ content: msg, ephemeral: true }) : contexto.reply(msg);
  }

  const novosAvisos = Math.max(0, avisosAtuais - qtdRemover);
  await db.set(chave, novosAvisos);

  const embed = new EmbedBuilder()
    .setTitle('✅ Advertência(s) Removida(s)')
    .setColor('#2ecc71')
    .setDescription(`Foi(ram) removida(s) **${qtdRemover}** advertência(s) do membro **${target.user.tag}**.\n\n**Total atual:** \`${novosAvisos}\``)
    .setFooter({ text: `Removido por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
