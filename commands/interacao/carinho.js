const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { executarInteracao } = require('../../utils/interacaoHelper');

module.exports = {
  name: 'carinho',
  aliases: ['pat', 'cafune'],
  description: 'Faça carinho na cabeça de alguém',
  slashData: new SlashCommandBuilder()
    .setName('carinho')
    .setDescription('Faça carinho na cabeça de alguém')
    .addUserOption(opt => opt.setName('usuario').setDescription('Membro para fazer carinho').setRequired(true)),

  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first();
    if (!target) return message.reply(`❌ Mencione alguém! Ex: \`${prefix}carinho @membro\``);
    if (target.id === message.author.id) return message.reply('❌ Você não pode fazer carinho em si mesmo!');

    return executarInteracao({ contexto: message, autor: message.author, alvo: target, client, endpoint: 'pat', nomeAcao: 'carinho em', emoji: '🪶', cor: '#1ABC9C', isSlash: false });
  },

  async executeSlash(interaction, client) {
    const target = interaction.options.getUser('usuario');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Você não pode fazer carinho em si mesmo!', flags: [MessageFlags.Ephemeral] });
    }

    return executarInteracao({ contexto: interaction, autor: interaction.user, alvo: target, client, endpoint: 'pat', nomeAcao: 'carinho em', emoji: '🪶', cor: '#1ABC9C', isSlash: true });
  }
};
