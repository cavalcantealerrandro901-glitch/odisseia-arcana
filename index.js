const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Servidor HTTP simples para satisfazer a exigência de porta do Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 O Bot do Discord está online e operando!');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 [SERVIDOR] Servidor HTTP rodando na porta ${PORT}`);
});

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

// Conexão com o MongoDB Atlas
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('🌿 [DATABASE] Conectado com sucesso ao MongoDB!'))
    .catch(err => console.error('❌ [DATABASE] Erro ao conectar no MongoDB:', err));
} else {
  console.warn('⚠️ [DATABASE] Nenhuma URI do MongoDB encontrada nas variáveis de ambiente!');
}

client.once('ready', () => {
  console.log(`⚡ [ONLINE] Bot online e pronto para uso como: ${client.user.tag}`);
});

// Carregador automático de comandos
const loadCommands = () => {
  console.log('📦 [SISTEMA] Inicializando carregamento de comandos...');
  let totalCommands = 0;
  const categoriesPath = path.join(__dirname, 'src', 'commands');
  
  if (fs.existsSync(categoriesPath)) {
    const categories = fs.readdirSync(categoriesPath);
    for (const category of categories) {
      const categoryPath = path.join(categoriesPath, category);
      if (fs.statSync(categoryPath).isDirectory()) {
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
          const filePath = path.join(categoryPath, file);
          const command = require(filePath);
          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`   └─ 📁 [${category.toUpperCase()}] Comando registrado: /${command.data.name}`);
            totalCommands++;
          }
        }
      }
    }
  }
  console.log(`✅ [SISTEMA] Sucesso! Total de ${totalCommands} comandos registrados na memória.`);
};

loadCommands();

// Manipulador de interações com proteção contra duplo envio (evita erro 40060)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[ERRO INTERAÇÃO] Falha na execução do comando /${interaction.commandName}:`, error);
    
    const errorMessage = { content: '❌ Ocorreu um erro ao executar este comando!', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage).catch(() => {});
    } else {
      await interaction.reply(errorMessage).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
