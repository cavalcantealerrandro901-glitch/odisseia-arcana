const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'ajuda',
  aliases: ['help', 'comandos'],
  description: 'Exibe a lista de comandos e o prefixo atual do servidor',
  slashData: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe a lista de comandos e o prefixo atual do servidor'),

  async execute(message, args, client, prefix) {
    return enviarAjuda(message, client, prefix, false);
  },

  async executeSlash(interaction, client) {
    let guildConfig = await Guild.findOne({ guildId: interaction.guildId });
    const prefix = guildConfig?.prefix || process.env.BOT_PREFIX || '!';
    return enviarAjuda(interaction, client, prefix, true);
  }
};

async function enviarAjuda(contexto, client, prefix, isSlash = false) {
  const autor = isSlash ? contexto.user : contexto.author;

  const embed = new EmbedBuilder()
    .setTitle('📖 Central de Ajuda')
    .setDescription(`📌 **Prefixo atual neste servidor:** \`${prefix}\`\n\nVocê também pode utilizar os comandos por barra (\`/\`).`)
    .setColor('#5865F2')
    .setThumbnail(client.user.displayAvatarURL())
    .addFields(
      {
        name: '⚙️ Configuração',
        value: `\`${prefix}prefixo <novo_prefixo>\` — Altera ou visualiza o prefixo do servidor.`
      },
      {
        name: '💰 Economia',
        value: `\`${prefix}saldo\` | \`${prefix}atm\` | \`${prefix}bal\` — Exibe o patrimônio total.\n\`${prefix}work\` — Trabalhe para ganhar moedas.\n\`${prefix}daily\` — Resgate sua recompensa diária.\n\`${prefix}pay <membro> <valor>\` — Transfira moedas.`
      },
      {
        name: '💖 Interação',
        value: `\`${prefix}beijo\` — Dê um beijo em alguém.\n\`${prefix}abraco\` — Dê um abraço.\n\`${prefix}carinho\` — Faça carinho na cabeça.\n\`${prefix}tapa\` — Dê um tapa.`
      },
      {
        name: '🛡️ Moderação',
        value: `\`${prefix}clear <quantidade>\` — Limpa mensagens do chat.\n\`${prefix}kick <membro>\` — Expulsa um membro.\n\`${prefix}ban <membro>\` — Bane um membro.`
      }
    )
    .setFooter({ text: `Solicitado por ${autor.username}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  return isSlash ? contexto.reply({ embeds: [embed] }) : contexto.reply({ embeds: [embed] });
}
