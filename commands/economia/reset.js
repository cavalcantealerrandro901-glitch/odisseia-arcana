const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'reset',
  aliases: ['resetar', 'zerar', 'clear-saldo', 'removeralmas'],
  description: 'Reseta ou remove uma quantidade de almas de um ou mais usuários (Apenas Admins)',
  slashData: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reseta ou remove almas de um usuário')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Selecione o usuário para resetar')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade a remover (deixe em branco para ZERAR TUDO)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(message, args, client) {
    // Verificação de permissão (Administrador ou Gerenciar Servidor)
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && 
        !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ Você precisa ter permissão de **Administrador** para usar este comando!');
    }

    // Filtrar menções válidas (ignora bots)
    const mencoes = message.mentions.users.filter(u => !u.bot);

    if (mencoes.size === 0) {
      return message.reply('⚠️ Mencione pelo menos um usuário para resetar!\nExemplo para zerar tudo: `O.reset @Usuario1 @Usuario2`\nExemplo para tirar valor específico: `O.reset 500 @Usuario1 @Usuario2`');
    }

    // Procurar por número nos argumentos
    const argQuant = args.find(a => !isNaN(a) && parseInt(a) > 0);
    const quantidade = argQuant ? parseInt(argQuant) : null;

    return processarReset(message, message.author, Array.from(mencoes.values()), quantidade, false);
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ Você precisa de permissão de Administrador para usar este comando!', 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    const targetUser = interaction.options.getUser('usuario');
    const quantidade = interaction.options.getInteger('quantidade'); // Pode ser null se não informado

    return processarReset(interaction, interaction.user, [targetUser], quantidade, true);
  }
};

async function processarReset(contexto, autor, usuarios, quantidade, isSlash = false) {
  const resumo = [];

  for (const usuario of usuarios) {
    const userId = usuario.id;
    const carteira = (await db.get(`carteira_${userId}`)) || 0;
    const banco = (await db.get(`banco_${userId}`)) || 0;

    if (quantidade === null) {
      // Zerar TUDO (Carteira + Banco)
      await db.set(`carteira_${userId}`, 0);
      await db.set(`banco_${userId}`, 0);
      resumo.push(`• ${usuario}: Saldo totalmente **zerado** *(Carteira + Banco)*`);
    } else {
      // Descontar valor específico (priorizando a carteira e depois o banco)
      let sobrou = quantidade;
      let novaCarteira = carteira;
      let novoBanco = banco;

      if (novaCarteira >= sobrou) {
        novaCarteira -= sobrou;
        sobrou = 0;
      } else {
        sobrou -= novaCarteira;
        novaCarteira = 0;
        novoBanco = Math.max(0, novoBanco - sobrou);
      }

      await db.set(`carteira_${userId}`, novaCarteira);
      await db.set(`banco_${userId}`, novoBanco);

      resumo.push(`• ${usuario}: Removidas \`${quantidade.toLocaleString('pt-BR')}\` almas`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('🔄 Reset de Saldo Concluído')
    .setAuthor({ name: autor.globalName || autor.username, iconURL: autor.displayAvatarURL() })
    .setColor('#FF0000')
    .setDescription(resumo.join('\n'))
    .setTimestamp();

  if (isSlash) {
    return contexto.reply({ embeds: [embed] });
  } else {
    return contexto.reply({ embeds: [embed] });
  }
}
