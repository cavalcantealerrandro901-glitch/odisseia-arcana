const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('criarfig')
        .setDescription('Cria uma nova figurinha no servidor a partir de uma imagem.')
        .addAttachmentOption(option =>
            option.setName('imagem')
                .setDescription('A imagem para a figurinha (PNG ou JPG)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('O nome da figurinha')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),
    
    async execute(interaction) {
        const attachment = interaction.options.getAttachment('imagem');
        const name = interaction.options.getString('nome');

        if (!attachment.contentType || !['image/png', 'image/jpeg', 'image/jpg'].includes(attachment.contentType)) {
            return interaction.reply({ 
                content: '❌ Envie um arquivo de imagem válido nos formatos PNG ou JPG!', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            await interaction.guild.stickers.create({
                file: attachment.url,
                name: name,
                tags: 'figura, aeternos'
            });

            await interaction.editReply(`✅ Figurinha **${name}** criada com sucesso no servidor!`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Ocorreu um erro ao criar a figurinha. Verifique se o limite de figurinhas do servidor foi atingido.');
        }
    },
};
