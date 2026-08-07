const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Abre o painel de resgate da sua recompensa diária.'),
  name: 'daily',
  description: 'Abre o painel de resgate da sua recompensa diária.',
  async execute(ctx, client, isSlash, args = []) {
    const author = ctx.author || ctx.user;
    const UserModel = mongoose.models.User;

    if (!UserModel) {
      return ctx.reply({ content: '❌ Erro ao conectar ao banco de dados.' });
    }

    let userData = await UserModel.findOne({ userId: author.id });
    if (!userData) {
      userData = await UserModel.create({ userId: author.id });
    }

    const now = new Date();
    const lastDaily = userData.lastDaily ? new Date(userData.lastDaily) : null;

    // Lógica da Meia-Noite
    const isSameDay = lastDaily && 
      lastDaily.getDate() === now.getDate() &&
      lastDaily.getMonth() === now.getMonth() &&
      lastDaily.getFullYear() === now.getFullYear();

    // Verificação se perdeu a sequência (mais de 48h sem resgatar)
    let streak = userData.dailyStreak || 0;
    if (lastDaily) {
      const diffTime = Math.abs(now - lastDaily);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 2) {
        streak = 0; // Perdeu a sequência por faltar um dia
      }
    }

    // Embed do Painel
    const embed = new EmbedBuilder()
      .setTitle(`🎁 Recompensa Diária — ${author.username}`)
      .setColor('#5865F2')
      .setThumbnail(author.displayAvatarURL({ dynamic: true }))
      .setDescription(
        isSameDay 
          ? `❌ **Você já resgatou seu Daily hoje!**\n\nO resgate é liberado todos os dias à **meia-noite (00:00)**.\n🔥 **Sua Sequência Atual:** \`${streak} dia(s)\``
          : `Pronto para garantir seu dinheiro do dia?\n\n🔥 **Sua Sequência:** \`${streak} dia(s)\`\n💡 *Manter a sequência diária aumenta o valor da sua recompensa!*`
      )
      .setFooter({ text: `Prefixo: ${ctx.prefix || '!'}` })
      .setTimestamp();

    // Botão de Resgate
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`claim_daily_${author.id}`)
        .setLabel(isSameDay ? 'Já Resgatado Hoje' : '🎁 Resgatar Daily')
        .setStyle(isSameDay ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(isSameDay)
    );

    const response = isSlash 
      ? await ctx.reply({ embeds: [embed], components: [row], fetchReply: true })
      : await ctx.reply({ embeds: [embed], components: [row] });

    if (isSameDay) return;

    // Coletor do Botão
    const collector = response.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== author.id) {
        return interaction.reply({ content: '❌ Este painel não pertence a você!', ephemeral: true });
      }

      if (interaction.customId === `claim_daily_${author.id}`) {
        // Atualiza a Sequência
        streak += 1;

        // Recompensa Base ($2.000 a $5.000) + Bônus por Sequência ($500 por dia de streak)
        const baseReward = Math.floor(Math.random() * 3000) + 2000;
        const streakBonus = (streak - 1) * 500;
        const totalReward = baseReward + streakBonus;

        userData.wallet += totalReward;
        userData.lastDaily = now;
        userData.dailyStreak = streak;
        await userData.save();

        // Atualiza a Embed do Canal
        const successEmbed = new EmbedBuilder()
          .setTitle('🎉 Daily Resgatado com Sucesso!')
          .setColor('#57F287')
          .setDescription(`Você recebeu **$${totalReward.toLocaleString()}** na sua carteira!`)
          .addFields(
            { name: '💰 Base', value: `\`$${baseReward.toLocaleString()}\``, inline: true },
            { name: '🔥 Bônus de Sequência', value: `\`+$${streakBonus.toLocaleString()}\``, inline: true },
            { name: '⚡ Sequência Atual', value: `\`${streak} dia(s)\``, inline: true }
          )
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('claimed_done')
            .setLabel('✅ Resgatado!')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await interaction.update({ embeds: [successEmbed], components: [disabledRow] });

        // Envia Notificação no PV (DM)
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🎁 Confirmação de Resgate Diário')
            .setColor('#FEE75C')
            .setDescription(`Olá **${author.username}**, passando para confirmar que seu Daily foi creditado com sucesso!`)
            .addFields(
              { name: '💵 Valor Depositado', value: `\`$${totalReward.toLocaleString()}\``, inline: true },
              { name: '🔥 Sequência Mantida', value: `\`${streak} dia(s)\``, inline: true }
            )
            .setFooter({ text: 'Volte amanhã após a meia-noite para manter sua sequência!' })
            .setTimestamp();

          await author.send({ embeds: [dmEmbed] });
        } catch (e) {
          // PV do usuário fechado
        }
      }
    });
  }
};
