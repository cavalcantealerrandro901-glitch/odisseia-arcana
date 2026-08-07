const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

// Converter letras (1k, 2.5m, 1b, etc.) em números inteiros
function converterQuantidade(texto) {
  if (!texto) return null;
  const str = texto.toString().trim().toLowerCase();
  const regex = /^(\d+(?:\.\d+)?)\s*([kmbt])?$/;
  const match = str.match(regex);
  
  if (!match) return null;
  
  let val = parseFloat(match[1]);
  const sufixo = match[2];

  if (sufixo === 'k') val *= 1_000;
  else if (sufixo === 'm') val *= 1_000_000;
  else if (sufixo === 'b') val *= 1_000_000_000;
  else if (sufixo === 't') val *= 1_000_000_000_000;

  return Math.floor(val);
}

module.exports = {
  name: 'addalmas',
  aliases: ['add', 'addcoins', 'daralmas', 'adicionaralmas'],
  description: 'Adiciona almas para um ou mais usuários aceitando notação de letras (Apenas Admins)',
  slashData: new SlashCommandBuilder()
    .setName('addalmas')
    .setDescription('Adiciona almas à carteira de um usuário')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Selecione o usuário para receber as almas')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade de almas (Ex: 500, 10k, 2.5m, 1b)')
        .setRequired(true)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && 
        !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ Você precisa ter permissão de **Administrador** para usar este comando!');
    }

    const mencoes = message.mentions.users.filter(u => !u.bot);

    if (mencoes.size === 0) {
      return message.reply('⚠️ Mencione pelo menos um usuário para adicionar almas!\nExemplo: `O.addalmas 10k @Usuario1 @Usuario2`');
    }

    // Procurar por argumento numérico/letra válido nos argumentos
    let quantiaConvertida = null;
    for (const arg of args) {
      if (!arg.startsWith('<@') && !arg.endsWith('>')) {
        const parsed = converterQuantidade(arg);
        if (parsed !== null && parsed > 0) {
          quantiaConvertida = parsed;
          break;
        }
      }
    }

    if (!quantiaConvertida) {
      return message.reply('⚠️ Informe uma quantidade válida de almas!\nFormatos aceitos: `500`, `10k`, `2.5m`, `1b`');
    }

    return processarAddAlmas(message, message.author, Array.from(mencoes.values()), quantiaConvertida, false);
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ Você precisa de permissão de Administrador para usar este comando!', 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    const targetUser = interaction.options.getUser('usuario');
    const quantiaString = interaction.options.getString('quantidade');
    const quantiaConvertida = converterQuantidade(quantiaString);

    if (!quantiaConvertida || quantiaConvertida <= 0) {
      return interaction.reply({ 
        content: '❌ Quantidade inválida! Use valores normais ou abreviações (Ex: `500`, `10k`, `2.5m`, `1b`).', 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    return processarAddAlmas(interaction, interaction.user, [targetUser], quantiaConvertida, true);
  }
};

async function processarAddAlmas(contexto, autor, usuarios, quantidade, isSlash = false) {
  const resumo = [];

  for (const usuario of usuarios) {
    const userId = usuario.id;
    const carteira = (await db.get(`carteira_${userId}`)) || 0;
    const novoSaldo = carteira + quantidade;

    await db.set(`carteira_${userId}`, novoSaldo);

    resumo.push(`• ${usuario}: \`+${quantidade.toLocaleString('pt-BR')}\` almas *(Novo saldo: \`${novoSaldo.toLocaleString('pt-BR')}\`)*`);
  }

  const embed = new EmbedBuilder()
    .setTitle('✨ Almas Adicionadas com Sucesso!')
    .setAuthor({ name: autor.globalName || autor.username, iconURL: autor.displayAvatarURL() })
    .setColor('#00FFA3')
    .setDescription(resumo.join('\n'))
    .setTimestamp();

  if (isSlash) {
    return contexto.reply({ embeds: [embed] });
  } else {
    return contexto.reply({ embeds: [embed] });
  }
}
