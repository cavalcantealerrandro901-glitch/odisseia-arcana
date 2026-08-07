const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { executarInteracao } = require('../../utils/interacaoHelper');

module.exports = {
  name: 'beijo',
  aliases: ['kiss', 'beijar'],
  description: 'Dê um beijo em alguém',
  slashData: new SlashCommandBuilder()
    .setName('beijo')
    .setDescription('Dê um beijo em alguém')
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser beijado').setRequired(true)),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Mencione alguém! Ex: \`${prefix}beijo @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode beijar a si mesmo!');

    return executarInteracao({ contexto: message, autor: message.author, alvo: target, client, endpoint: 'kiss', nomeAcao: 'um beijo em', emoji: '💋', cor: '#E91E63', isSlash: false });
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode beijar a si mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao({ contexto: interaction, autor: interaction.user, alvo: target, client, endpoint: 'kiss', nomeAcao: 'um beijo em', emoji: '💋', cor: '#E91E63', isSlash: true });
  }
};
