const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'ajuda',
  aliases: ['help', 'comandos'],
  description: 'Mostra a lista de comandos disponíveis do bot',
  slashData: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Mostra a lista de comandos do bot'),

  async execute(message, args, client, prefix) {
    return enviarAjuda(message, client, prefix, false);
  },

  async executeSlash(interaction, client) {
    let guildConfig = await Guild.findOne({ guildId: interaction.guildId });
    const prefix = guildConfig?.prefix || process.env.PREFIX || '!';
    return enviarAjuda(interaction, client, prefix, true);
  }
};

async function enviarAjuda(contexto, client, prefix, isSlash = false) {
  const embed = new EmbedBuilder()
    .setTitle('📖 Central de Ajuda')
    .setDescription(`O prefixo atual neste servidor é: \`${prefix}\` ou use os comandos em Slash (\`/\`).`)
    .setColor('#5865F2')
    .setThumbnail(client.user.displayAvatarURL())
    .addFields(
      {
        name: '⚙️ Configuração',
        value: `\`${prefix}prefixo\` - Veja ou altere o prefixo do servidor.`
      },
      {
        name: '💰 Economia',
        value: `\`${prefix}saldo\` - Veja seu saldo ou de outro membro.\n\`${prefix}daily\` - Resgate seu prêmio diário.\n\`${prefix}trabalhar\` - Trabalhe para ganhar moedas.\n\`${prefix}pagar\` - Transfira moedas para alguém.`
      },
      {
        name: '💖 Interação',
        value: `\`${prefix}beijo\` - Dê um beijo em alguém.\n\`${prefix}abraço\` - Dê um abraço aconchegante.\n\`${prefix}carinho\` - Faça carinho na cabeça.\n\`${prefix}tapa\` - Dê um tapa.`
      }
    )
    .setFooter({ text: `Execute ${prefix}ajuda [comando] para mais detalhes` })
    .setTimestamp();

  return isSlash ? contexto.reply({ embeds: [embed] }) : contexto.reply({ embeds: [embed] });
}
