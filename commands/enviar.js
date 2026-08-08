const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function parseColor(colorInput) {
  if (!colorInput) return 0x9b59b6; // Cor padrão (Roxo Aeternos)
  const clean = colorInput.toLowerCase().trim();
  
  const colors = {
    vermelho: 0xe74c3c, red: 0xe74c3c,
    verde: 0x2ecc71, green: 0x2ecc71,
    azul: 0x3498db, blue: 0x3498db,
    amarelo: 0xf1c40f, yellow: 0xf1c40f,
    roxo: 0x9b59b6, purple: 0x9b59b6,
    rosa: 0xe91e63, pink: 0xe91e63,
    laranja: 0xe67e22, orange: 0xe67e22,
    branco: 0xffffff, white: 0xffffff,
    preto: 0x000000, black: 0x000000
  };

  if (colors[clean]) return colors[clean];

  // Tenta converter caso seja um código hexadecimal (ex: #ff0000 ou ff0000)
  const hexClean = clean.replace('#', '');
  const parsedHex = parseInt(hexClean, 16);
  if (!isNaN(parsedHex)) return parsedHex;

  return 0x9b59b6;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enviar')
    .setDescription('Envia uma mensagem oficial através do bot (Apenas Administradores).')
    .addStringOption(option =>
      option.setName('mensagem')
        .setDescription('O texto que o bot irá enviar')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('embed')
        .setDescription('Deseja enviar formatado em embed? (True/False)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('cor')
        .setDescription('Cor do embed (ex: vermelho, azul, verde ou #ff0000)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  name: 'enviar',
  aliases: ['say', 'anunciar'],
  category: 'Administração',
  description: 'Envia uma mensagem pelo bot.',
  async execute(ctx, client, isSlash, args = []) {
    let text, useEmbed, colorInput;

    if (isSlash) {
      text = ctx.options.getString('mensagem');
      useEmbed = ctx.options.getBoolean('embed') || false;
      colorInput = ctx.options.getString('cor');

      await ctx.deferReply({ ephemeral: true });

      if (useEmbed) {
        const embed = new EmbedBuilder()
          .setDescription(text)
          .setColor(parseColor(colorInput))
          .setTimestamp();
        
        await ctx.channel.send({ embeds: [embed] });
        await ctx.editReply({ content: '✅ Mensagem em embed enviada com sucesso!' });
      } else {
        await ctx.channel.send({ content: text });
        await ctx.editReply({ content: '✅ Mensagem enviada com sucesso!' });
      }
    } else {
      // Caso executado por prefixo
      text = args.join(' ');
      if (!text) {
        return ctx.reply({ content: '❌ Você precisa informar o texto da mensagem.', ephemeral: true });
      }

      await ctx.channel.send({ content: text });
      await ctx.delete().catch(() => {});
    }
  }
};
