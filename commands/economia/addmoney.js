const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { Database } = require('st.db');
const db = new Database({ filePath: './database/economia.json' });

module.exports = {
  name: 'addmoney',
  aliases: ['adicionarmoedas', 'givemoney'],
  description: 'Adiciona moedas virtuais na carteira de um membro (Apenas Administradores)',
  slashData: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('Adiciona moedas na carteira de um membro')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Membro que receberá as moedas')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantia')
        .setDescription('Quantidade de moedas a adicionar')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas **Administradores** podem usar este comando.');
    }

    const target = message.mentions.users.first();
    const quantia = parseInt(args[1]);

    if (!target) return message.reply('❓ Mencione o membro que receberá as moedas.');
    if (!quantia || isNaN(quantia) || quantia <= 0) return message.reply('❓ Informe uma quantia válida.');

    return adicionarMoedas(message, target, quantia, message.author);
  },

  async executeSlash(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas **Administradores** podem usar este comando.', ephemeral: true });
    }

    const target = interaction.options.getUser('usuario');
    const quantia = interaction.options.getInteger('quantia');

    return adicionarMoedas(interaction, target, quantia, interaction.user, true);
  }
};

async function adicionarMoedas(contexto, target, quantia, autor, isSlash = false) {
  const chaveCarteira = `carteira_${target.id}`;
  const saldoAtual = (await db.get(chaveCarteira)) || 0;
  const novoSaldo = saldoAtual + quantia;

  await db.set(chaveCarteira, novoSaldo);

  const embed = new EmbedBuilder()
    .setTitle('✨ Moedas Adicionadas!')
    .setColor('#2ecc71')
    .setDescription(`Foram adicionadas **+${quantia.toLocaleString()}** 🪙 na carteira de ${target}.\n\n**Novo Saldo na Carteira:** \`${novoSaldo.toLocaleString()}\` 🪙`)
    .setFooter({ text: `Executado por ${autor.tag}`, iconURL: autor.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (isSlash) {
    await contexto.reply({ embeds: [embed] });
  } else {
    await contexto.reply({ embeds: [embed] });
  }
}
