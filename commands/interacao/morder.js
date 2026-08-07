const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { executarInteracao } = require('../../utils/interacaoHelper');

module.exports = {
  name: 'morder',
  aliases: ['bite', 'mordida'],
  description: 'Dê uma mordida em alguém',
  slashData: new SlashCommandBuilder()
    .setName('morder')
    .setDescription('Dê uma mordida em alguém')
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro a ser mordido').setRequired(true)),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Mencione alguém! Ex: \`${prefix}morder @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode morder a si mesmo!');

    return executarInteracao({ contexto: message, autor: message.author, alvo: target, client, endpoint: 'bite', nomeAcao: 'uma mordida em', emoji: '🦷', cor: '#E67E22', isSlash: false });
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode morder a si mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao({ contexto: interaction, autor: interaction.user, alvo: target, client, endpoint: 'bite', nomeAcao: 'uma mordida em', emoji: '🦷', cor: '#E67E22', isSlash: true });
  }
};
