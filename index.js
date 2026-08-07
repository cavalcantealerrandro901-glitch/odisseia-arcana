require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Servidor HTTP simples para manter o Render ativo
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Bot do Discord Online e a Funcionar!');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 [SERVIDOR] Servidor HTTP a rodar na porta ${PORT}`);
});

// 2. Inicialização do Cliente com Intenções Necessárias
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildExpressions
  ]
});

// Separação estrita das coleções de comandos
client.commands = new Collection();       // Guarda comandos Slash (/)
client.prefixCommands = new Collection(); // Guarda comandos de Prefixo (!)
const PREFIX = '!';                      // Alterar aqui se o prefixo for outro

// 3. Conexão ao MongoDB Atlas
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('🌿 [DATABASE] Conectado com sucesso ao MongoDB!'))
    .catch(err => console.error('❌ [DATABASE] Erro ao conectar ao MongoDB:', err));
} else {
  console.warn('⚠️ [DATABASE] Nenhuma URI do MongoDB configurada nas variáveis de ambiente.');
}

// Função auxiliar para procurar ficheiros de forma recursiva
const getAllFiles = (dirPath, arrayOfFiles = []) => {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
};

// 4. Carregador de Comandos (Separado e Seguro)
const slashCommandsArray = [];
const loadedSlashNames = new Set();

const loadCommands = () => {
  console.log('📦 [SISTEMA] A iniciar o carregamento de comandos...');
  let totalSlash = 0;
  let totalPrefix = 0;

  const pathsToSearch = [
    path.join(__dirname, 'src', 'commands'),
    path.join(__dirname, 'commands')
  ];

  const commandFiles = [];
  pathsToSearch.forEach(p => getAllFiles(p, commandFiles));
  const uniqueFiles = [...new Set(commandFiles)];

  for (const filePath of uniqueFiles) {
    try {
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);
      const fileName = path.basename(filePath);

      if (!command) continue;

      // A) REGISTO DE COMANDO SLASH (deve possuir a propriedade 'data')
      if (command.data) {
        const cmdData = typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data;
        const cmdName = cmdData.name ? cmdData.name.toLowerCase() : null;

        if (cmdName) {
          if (loadedSlashNames.has(cmdName)) {
            console.warn(`   ⚠️ [DUPLICADO IGNORADO] Slash /${cmdName} em ${fileName}`);
          } else {
            client.commands.set(cmdName, command);
            slashCommandsArray.push(cmdData);
            loadedSlashNames.add(cmdName);
            console.log(`   └─ 📁 [SLASH] /${cmdName} (${fileName})`);
            totalSlash++;
          }
        }
      }

      // B) REGISTO DE COMANDO DE PREFIXO (deve possuir 'name' e NÃO possuir 'data')
      if (command.name && !command.data) {
        const cmdName = command.name.toLowerCase();
        client.prefixCommands.set(cmdName, command);
        console.log(`   └─ 📁 [PREFIXO] ${PREFIX}${cmdName} (${fileName})`);
        totalPrefix++;
      }

    } catch (err) {
      console.error(`❌ [ERRO AO CARREGAR] Ficheiro ${filePath}:`, err.message);
    }
  }

  console.log(`✅ [SISTEMA] Carregamento finalizado: ${totalSlash} Slash Commands e ${totalPrefix} Comandos de Prefixo.`);
};

loadCommands();

// 5. Evento de Inicialização e Registo de Slash Commands no Discord
client.once('clientReady', async () => {
  console.log(`⚡ [ONLINE] Bot ligado com sucesso como: ${client.user.tag}`);

  if (slashCommandsArray.length > 0) {
    try {
      console.log(`🔄 [API DISCORD] A registar ${slashCommandsArray.length} comandos Slash na API do Discord...`);
      const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
      
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: slashCommandsArray }
      );
      console.log('✅ [API DISCORD] Todos os comandos Slash foram sincronizados com sucesso!');
    } catch (error) {
      console.error('❌ [API DISCORD] Erro ao sincronizar comandos Slash:', error);
    }
  } else {
    console.warn('⚠️ [API DISCORD] Nenhum comando Slash válido foi encontrado para registar.');
  }
});

// 6. Gestor de Comandos Slash (Interações)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    if (typeof command.execute === 'function') {
      await command.execute(interaction, client);
    } else if (typeof command.run === 'function') {
      await command.run(client, interaction);
    }
  } catch (error) {
    console.error(`❌ [ERRO SLASH] Falha ao executar /${interaction.commandName}:`, error);
    const errorMsg = { content: '❌ Ocorreu um erro ao executar este comando!', ephemeral: true };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg).catch(() => {});
    } else {
      await interaction.reply(errorMsg).catch(() => {});
    }
  }
});

// 7. Gestor de Comandos de Prefixo (Mensagens do Chat)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.prefixCommands.get(commandName) || 
                  client.prefixCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  try {
    if (typeof command.execute === 'function') {
      await command.execute(message, args, client);
    } else if (typeof command.run === 'function') {
      await command.run(client, message, args);
    }
  } catch (error) {
    console.error(`❌ [ERRO PREFIXO] Falha ao executar ${PREFIX}${commandName}:`, error);
    message.reply('❌ Ocorreu um erro ao executar este comando!').catch(() => {});
  }
});

// 8. Inicialização do Bot
const token = process.env.TOKEN;
if (!token) {
  console.error('❌ [ERRO CRÍTICO] A variável TOKEN não está definida no ficheiro .env ou no painel!');
  process.exit(1);
}

client.login(token);
