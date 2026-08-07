const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { executarInteracao } = require('../../utils/interacaoHelper');

module.exports = {
  name: 'dançar',
  aliases: ['dancar', 'dance'],
  description: 'Dança com alguém',
  slashData: new SlashCommandBuilder()
    .setName('dancar')
    .setDescription('Dança com alguém')
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro com quem quer dançar').setRequired(true)),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Mencione alguém! Ex: \`${prefix}dancar @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode dançar com você mesmo!');

    return executarInteracao({ contexto: message, autor: message.author, alvo: target, client, endpoint: 'dance', nomeAcao: 'uma dança com', emoji: '💃', cor: '#F1C40F', isSlash: false });
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode dançar com você mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao({ contexto: interaction, autor: interaction.user, alvo: target, client, endpoint: 'dance', nomeAcao: 'uma dança com', emoji: '💃', cor: '#F1C40F', isSlash: true });
  }
};
