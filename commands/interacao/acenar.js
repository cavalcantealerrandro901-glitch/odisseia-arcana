const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { executarInteracao } = require('../../utils/interacaoHelper');

module.exports = {
  name: 'acenar',
  aliases: ['wave', 'oi'],
  description: 'Acene para alguém',
  slashData: new SlashCommandBuilder()
    .setName('acenar')
    .setDescription('Acene para alguém')
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro para quem quer acenar').setRequired(true)),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Mencione alguém! Ex: \`${prefix}acenar @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode acenar para você mesmo!');

    return executarInteracao({ contexto: message, autor: message.author, alvo: target, client, endpoint: 'wave', nomeAcao: 'um aceno para', emoji: '👋', cor: '#3498DB', isSlash: false });
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode acenar para você mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao({ contexto: interaction, autor: interaction.user, alvo: target, client, endpoint: 'wave', nomeAcao: 'um aceno para', emoji: '👋', cor: '#3498DB', isSlash: true });
  }
};
