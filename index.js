require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  REST, 
  Routes, 
  EmbedBuilder 
} = require('discord.js');
const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Servidor HTTP para Keep-Alive no Render
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Bot Online e Operacional!');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 [HTTP] Servidor Web ativo na porta ${PORT}`);
});

// 2. Cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
client.prefixCommands = new Collection();
const DEFAULT_PREFIX = process.env.PREFIX || '!';

// 3. Database & Schemas
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: DEFAULT_PREFIX }
});

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  debt: { type: Number, default: 0 },
  debtDueDate: { type: Date, default: null },
  debtNotified: { type: Boolean, default: false },
  lastDaily: { type: Date, default: null },
  dailyStreak: { type: Number, default: 0 },
  lastWork: { type: Date, default: null },
  workNotified: { type: Boolean, default: true },
  workLevel: { type: Number, default: 1 },
  workXp: { type: Number, default: 0 },
  afkReason: { type: String, default: null },
  afkTimestamp: { type: Date, default: null }
});

const GuildModel = mongoose.models.Guild || mongoose.model('Guild', guildSchema);
const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('🌿 [DATABASE] Conectado ao MongoDB!'))
    .catch(err => console.error('❌ [DATABASE] Erro MongoDB:', err.message));
}

// Prefixo Helper
const prefixCache = new Map();
client.getPrefix = async (guildId) => {
  if (!guildId) return DEFAULT_PREFIX;
  if (prefixCache.has(guildId)) return prefixCache.get(guildId);

  try {
    if (mongoose.connection.readyState === 1) {
      const data = await GuildModel.findOne({ guildId });
      const prefix = data?.prefix || DEFAULT_PREFIX;
      prefixCache.set(guildId, prefix);
      return prefix;
    }
  } catch (err) {}
  return DEFAULT_PREFIX;
};

client.setPrefix = async (guildId, newPrefix) => {
  if (!guildId) return;
  prefixCache.set(guildId, newPrefix);
  if (mongoose.connection.readyState === 1) {
    await GuildModel.findOneAndUpdate({ guildId }, { prefix: newPrefix }, { upsert: true });
  }
};

// Algoritmo de Similaridade
function getLevenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => 
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

// Cron de Dívidas
const checkDebts = async () => {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const usersWithDebt = await UserModel.find({ debt: { $gt: 0 } });
    const now = new Date();

    for (const user of usersWithDebt) {
      if (!user.debtDueDate) continue;

      const timeDiff = user.debtDueDate.getTime() - now.getTime();
      const hoursLeft = timeDiff / (1000 * 60 * 60);

      if (hoursLeft <= 6 && hoursLeft > 0 && !user.debtNotified) {
        try {
          const discordUser = await client.users.fetch(user.userId);
          const warnEmbed = new EmbedBuilder()
            .setTitle('⚠️ Alerta de Vencimento de Dívida!')
            .setColor('#FEE75C')
            .setDescription(`Sua dívida bancária de **$${user.debt.toLocaleString()}** vence em breve!\n\nPague pelo comando \`/banco\` para evitar a multa de **9,99%**.`)
            .setTimestamp();

          await discordUser.send({ embeds: [warnEmbed] });
          user.debtNotified = true;
          await user.save();
        } catch (e) {}
      }

      if (now > user.debtDueDate) {
        const penalty = Math.floor(user.debt * 0.0999);
        user.debt += penalty;

        const newDueDate = new Date();
        newDueDate.setHours(newDueDate.getHours() + 24);
        user.debtDueDate = newDueDate;
        user.debtNotified = false;

        await user.save();

        try {
          const discordUser = await client.users.fetch(user.userId);
          const penaltyEmbed = new EmbedBuilder()
            .setTitle('❌ Dívida Vencida - Multa Aplicada!')
            .setColor('#ED4245')
            .setDescription(`O prazo expirou! Sua dívida recebeu uma multa de **9,99%** (+$${penalty.toLocaleString()}).\n\n**Novo total:** $${user.debt.toLocaleString()}`)
            .setTimestamp();

          await discordUser.send({ embeds: [penaltyEmbed] });
        } catch (e) {}
      }
    }
  } catch (err) {}
};

setInterval(checkDebts, 5 * 60 * 1000);

// Cron de Avisos de Trabalho
const checkWorkCooldowns = async () => {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const cooldown = 20 * 60 * 1000;
    const now = new Date();

    const usersToNotify = await UserModel.find({ 
      workNotified: false, 
      lastWork: { $ne: null } 
    });

    for (const user of usersToNotify) {
      if (now - new Date(user.lastWork) >= cooldown) {
        try {
          const discordUser = await client.users.fetch(user.userId);
          const dmEmbed = new EmbedBuilder()
            .setTitle('🔔 Trabalho Disponível!')
            .setColor('#57F287')
            .setDescription(`Olá **${discordUser.username}**, seu tempo de descanso de 20 minutos terminou!\nVocê já pode trabalhar novamente usando \`/work\`.`)
            .setTimestamp();

          await discordUser.send({ embeds: [dmEmbed] });
        } catch (e) {}

        user.workNotified = true;
        await user.save();
      }
    }
  } catch (err) {}
};

setInterval(checkWorkCooldowns, 60 * 1000);

// Carregador de Comandos
const slashCommandsArray = [];

const loadCommands = () => {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) return;

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);

    if (command.data && command.name) {
      client.commands.set(command.name, command);
      client.prefixCommands.set(command.name, command);

      if (command.aliases && Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          client.prefixCommands.set(alias, command);
        }
      }

      slashCommandsArray.push(command.data.toJSON());
      console.log(`├─ 🚀 [CARREGADO] ${command.name}`);
    }
  }
};

loadCommands();

client.once('clientReady', async () => {
  console.log(`⚡ [ONLINE] Bot logado como: ${client.user.tag}`);

  if (slashCommandsArray.length > 0) {
    try {
      console.log('🔄 Sincronizando Slash Commands no Discord...');
      const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
      await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommandsArray });
      console.log('✅ Slash Commands sincronizados com sucesso!');
    } catch (e) {
      console.error('❌ Erro ao registrar Slash Commands:', e.message);
    }
  }
});

// Evento de Interações
client.on('interactionCreate', async interaction => {
  if (interaction.isModalSubmit()) {
    let userData = await UserModel.findOne({ userId: interaction.user.id });
    if (!userData) userData = new UserModel({ userId: interaction.user.id });

    if (interaction.customId === `modal_loan_${interaction.user.id}`) {
      const amount = parseInt(interaction.fields.getTextInputValue('loan_amount'), 10);
      if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '❌ Digite um valor numérico válido!', ephemeral: true });

      const debtWithInterest = Math.floor(amount * 1.07);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      userData.bank += amount;
      userData.debt = debtWithInterest;
      userData.debtDueDate = dueDate;
      userData.debtNotified = false;
      await userData.save();

      return interaction.reply({
        content: `✅ **Empréstimo Aprovado!**\n• **Valor Recebido:** $${amount.toLocaleString()}\n• **Dívida Total (7% juros):** $${debtWithInterest.toLocaleString()}`,
        ephemeral: true
      });
    }

    if (interaction.customId === `modal_pay_${interaction.user.id}`) {
      const input = interaction.fields.getTextInputValue('pay_amount').toLowerCase();
      let payAmount = input === 'tudo' ? userData.debt : parseInt(input, 10);

      if (isNaN(payAmount) || payAmount <= 0) return interaction.reply({ content: '❌ Valor inválido!', ephemeral: true });
      if (payAmount > userData.debt) payAmount = userData.debt;

      const totalBalance = userData.wallet + userData.bank;
      if (totalBalance < payAmount) return interaction.reply({ content: '❌ Saldo insuficiente!', ephemeral: true });

      if (userData.wallet >= payAmount) {
        userData.wallet -= payAmount;
      } else {
        const remaining = payAmount - userData.wallet;
        userData.wallet = 0;
        userData.bank -= remaining;
      }

      userData.debt -= payAmount;
      if (userData.debt <= 0) {
        userData.debt = 0;
        userData.debtDueDate = null;
        userData.debtNotified = false;
      }

      await userData.save();

      return interaction.reply({
        content: `✅ **Pagamento Realizado!**\n• **Pago:** $${payAmount.toLocaleString()}\n• **Dívida Restante:** $${userData.debt.toLocaleString()}`,
        ephemeral: true
      });
    }
  }

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    let userData = null;
    if (mongoose.connection.readyState === 1) {
      userData = await UserModel.findOne({ userId: interaction.user.id });
      if (!userData) userData = await UserModel.create({ userId: interaction.user.id });
    }

    interaction.prefix = await client.getPrefix(interaction.guildId);
    interaction.author = interaction.user;

    if (interaction.member && userData) {
      interaction.member.wallet = userData.wallet || 0;
      interaction.member.bank = userData.bank || 0;
      interaction.member.debt = userData.debt || 0;
      interaction.member.debtDueDate = userData.debtDueDate || null;
      interaction.member.lastDaily = userData.lastDaily || null;
      interaction.member.dailyStreak = userData.dailyStreak || 0;
      interaction.member.lastWork = userData.lastWork || null;
      interaction.member.workNotified = userData.workNotified ?? true;
      interaction.member.workLevel = userData.workLevel || 1;
      interaction.member.workXp = userData.workXp || 0;
    }

    try {
      await command.execute(interaction, client, true);
    } catch (err) {
      console.error(`❌ Erro no comando /${interaction.commandName}:`, err);
    }
  }
});

// Evento de Mensagens
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const currentPrefix = await client.getPrefix(message.guild.id);

  if (mongoose.connection.readyState === 1) {
    let authorData = await UserModel.findOne({ userId: message.author.id });
    if (authorData && authorData.afkTimestamp) {
      const isAfkCmd = message.content.startsWith(`${currentPrefix}afk`);
      
      if (!isAfkCmd) {
        authorData.afkReason = null;
        authorData.afkTimestamp = null;
        await authorData.save();
        message.reply(`👋 Bem-vindo(a) de volta, **${message.author.username}**! Removi seu status de AFK.`).catch(() => {});
      }
    }

    if (message.mentions.users.size > 0) {
      for (const [id, user] of message.mentions.users) {
        if (user.id === message.author.id || user.bot) continue;
        
        const mentionedData = await UserModel.findOne({ userId: user.id });
        if (mentionedData && mentionedData.afkTimestamp) {
          const timePassed = Math.floor((Date.now() - new Date(mentionedData.afkTimestamp).getTime()) / 1000 / 60);
          const timeStr = timePassed < 1 ? 'menos de 1 minuto' : `${timePassed} min`;
          const reason = mentionedData.afkReason || 'Sem motivo informado';

          message.reply(`💤 **${user.username}** está AFK: **${reason}** *(há ${timeStr})*`).catch(() => {});
        }
      }
    }
  }

  if (!message.content.startsWith(currentPrefix)) return;

  const args = message.content.slice(currentPrefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.prefixCommands.get(commandName);

  if (!command) {
    const availableCommands = Array.from(client.prefixCommands.keys());
    let bestMatch = null;
    let lowestDistance = Infinity;

    for (const cmd of availableCommands) {
      const dist = getLevenshteinDistance(commandName, cmd);
      if (dist < lowestDistance) {
        lowestDistance = dist;
        bestMatch = cmd;
      }
    }

    let suggestionText = '';
    if (bestMatch && lowestDistance <= 3) {
      suggestionText = ` Talvez você quis dizer \`${currentPrefix}${bestMatch}\`?`;
    }

    return message.reply(`❌ O comando \`${currentPrefix}${commandName}\` não existe.${suggestionText}\nSe não for, use o \`/ajuda\` ou \`${currentPrefix}ajuda\` e veja os nossos comandos disponíveis.`);
  }

  let userData = null;
  if (mongoose.connection.readyState === 1) {
    userData = await UserModel.findOne({ userId: message.author.id });
    if (!userData) userData = await UserModel.create({ userId: message.author.id });
  }

  message.prefix = currentPrefix;
  if (message.member && userData) {
    message.member.wallet = userData.wallet || 0;
    message.member.bank = userData.bank || 0;
    message.member.debt = userData.debt || 0;
    message.member.debtDueDate = userData.debtDueDate || null;
    message.member.lastDaily = userData.lastDaily || null;
    message.member.dailyStreak = userData.dailyStreak || 0;
    message.member.lastWork = userData.lastWork || null;
    message.member.workNotified = userData.workNotified ?? true;
    message.member.workLevel = userData.workLevel || 1;
    message.member.workXp = userData.workXp || 0;
  }

  try {
    await command.execute(message, client, false, args);
  } catch (err) {
    console.error(`❌ Erro no comando !${commandName}:`, err);
  }
});

const token = process.env.TOKEN;
if (token) client.login(token);
