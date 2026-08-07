const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { executarInteracao } = require('../../utils/interacaoHelper');

module.exports = {
  name: 'tapa',
  aliases: ['slap', 'bofetada'],
  description: 'Dê um tapa em alguém',
  slashData: new SlashCommandBuilder()
    .setName('tapa')
    .setDescription('Dê um tapa em alguém')
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser atingido').setRequired(true)),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Mencione alguém! Ex: \`${prefix}tapa @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode dar um tapa em si mesmo!');

    return executarInteracao({ contexto: message, autor: message.author, alvo: target, client, endpoint: 'slap', nomeAcao: 'um tapa em', emoji: '🤚', cor: '#E74C3C', isSlash: false });
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode dar um tapa em si mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao({ contexto: interaction, autor: interaction.user, alvo: target, client, endpoint: 'slap', nomeAcao: 'um tapa em', emoji: '🤚', cor: '#E74C3C', isSlash: true });
  }
};
