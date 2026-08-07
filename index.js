require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Servidor HTTP simples para o Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 O Bot do Discord está online e operando!');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 [SERVIDOR] Servidor HTTP rodando na porta ${PORT}`);
});

// 2. Cliente Discord com Intenções Necessárias
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildExpressions
  ]
});

client.commands = new Collection();
client.prefixCommands = new Collection();
const PREFIX = '!'; // Prefixo dos comandos de texto

// 3. Conexão com MongoDB
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('🌿 [DATABASE] Conectado com sucesso ao MongoDB!'))
    .catch(err => console.error('❌ [DATABASE] Erro ao conectar no MongoDB:', err));
} else {
  console.warn('⚠️ [DATABASE] Nenhuma URI do MongoDB encontrada!');
}

// Função auxiliar para procurar ficheiros .js de forma RECURSIVA em qualquer pasta
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

// 4. Carregador de Comandos Flexível e Recursivo
const slashCommandsArray = [];

const loadCommands = () => {
  console.log('📦 [SISTEMA] Inicializando carregamento de comandos...');
  let totalCommands = 0;

  // Procura comandos em 'src/commands' E em 'commands' (para cobrir qualquer estrutura)
  const pathsToSearch = [
    path.join(__dirname, 'src', 'commands'),
    path.join(__dirname, 'commands')
  ];

  const commandFiles = [];
  pathsToSearch.forEach(p => {
    getAllFiles(p, commandFiles);
  });

  // Remove caminhos duplicados caso existam
  const uniqueCommandFiles = [...new Set(commandFiles)];

  for (const filePath of uniqueCommandFiles) {
    try {
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);

      // Registra comandos Slash (possuem propriedade 'data')
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        slashCommandsArray.push(command.data.toJSON());
        console.log(`   └─ 📁 [SLASH] /${command.data.name} (${path.basename(filePath)})`);
        totalCommands++;
      } 
      // Registra comandos de Prefixo (possuem 'name' e 'execute'/'run', mas sem 'data')
      else if (command.name && (command.execute || command.run)) {
        client.prefixCommands.set(command.name, command);
        console.log(`   └─ 📁 [PREFIXO] ${PREFIX}${command.name} (${path.basename(filePath)})`);
        totalCommands++;
      }
    } catch (err) {
      console.error(`❌ Erro ao carregar o arquivo ${filePath}:`, err);
    }
  }

  console.log(`✅ [SISTEMA] Total de ${totalCommands} comandos carregados na memória.`);
};

loadCommands();

// 5. Quando o Bot Ficar Pronto + Registro dos Slash Commands na API
client.once('ready', async () => {
  console.log(`⚡ [ONLINE] Bot operando como: ${client.user.tag}`);

  // Registra / atualiza os comandos Slash globalmente no Discord
  if (slashCommandsArray.length > 0) {
    try {
      console.log(`🔄 [API DISCORD] Registrando ${slashCommandsArray.length} comandos de barra (Slash)...`);
      const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: slashCommandsArray }
      );
      console.log('✅ [API DISCORD] Comandos Slash sincronizados com sucesso!');
    } catch (error) {
      console.error('❌ [API DISCORD] Falha ao registrar comandos Slash:', error);
    }
  } else {
    console.warn('⚠️ [API DISCORD] Nenhum comando Slash encontrado para registrar!');
  }
});

// 6. Manipulador de Comandos Slash (/)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[ERRO SLASH] Falha no /${interaction.commandName}:`, error);
    const errorMsg = { content: '❌ Ocorreu um erro ao executar este comando!', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg).catch(() => {});
    } else {
      await interaction.reply(errorMsg).catch(() => {});
    }
  }
});

// 7. Manipulador de Comandos por Prefixo (!)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.prefixCommands.get(commandName) || client.commands.get(commandName);
  if (!command) return;

  try {
    if ('run' in command) {
      await command.run(client, message, args);
    } else if ('execute' in command && !('data' in command)) {
      await command.execute(message, args);
    }
  } catch (error) {
    console.error(`[ERRO PREFIXO] Falha no ${PREFIX}${commandName}:`, error);
    message.reply('❌ Ocorreu um erro ao executar este comando!').catch(() => {});
  }
});

// 8. Inicialização
const token = process.env.TOKEN;
if (!token) {
  console.error('❌ [ERRO] A variável TOKEN não está definida!');
  process.exit(1);
}

client.login(token);
