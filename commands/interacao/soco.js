const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { executarInteracao } = require('../../utils/interacaoHelper');

module.exports = {
  name: 'soco',
  aliases: ['punch', 'socao'],
  description: 'Dê um soco em alguém',
  slashData: new SlashCommandBuilder()
    .setName('soco')
    .setDescription('Dê um soco em alguém')
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a levar o soco').setRequired(true)),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Mencione alguém! Ex: \`${prefix}soco @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode dar um soco em si mesmo!');

    return executarInteracao({ contexto: message, autor: message.author, alvo: target, client, endpoint: 'punch', nomeAcao: 'um soco em', emoji: '🥊', cor: '#D35400', isSlash: false });
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode dar um soco em si mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao({ contexto: interaction, autor: interaction.user, alvo: target, client, endpoint: 'punch', nomeAcao: 'um soco em', emoji: '🥊', cor: '#D35400', isSlash: true });
  }
};
