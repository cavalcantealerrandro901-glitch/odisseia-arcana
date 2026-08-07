const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { executarInteracao } = require('../../utils/interacaoHelper');

module.exports = {
  name: 'abraço',
  aliases: ['abraco', 'hug'],
  description: 'Dê um abraço em alguém',
  slashData: new SlashCommandBuilder()
    .setName('abraco')
    .setDescription('Dê um abraço em alguém')
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser abraçado').setRequired(true)),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Mencione alguém! Ex: \`${prefix}abraco @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode abraçar a si mesmo!');

    return executarInteracao({ contexto: message, autor: message.author, alvo: target, client, endpoint: 'hug', nomeAcao: 'um abraço em', emoji: '🫂', cor: '#9B59B6', isSlash: false });
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode abraçar a si mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao({ contexto: interaction, autor: interaction.user, alvo: target, client, endpoint: 'hug', nomeAcao: 'um abraço em', emoji: '🫂', cor: '#9B59B6', isSlash: true });
  }
};
