const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('🪐 Bot Aeternus / Odisseia Arcana está 100% Online!');
});

function iniciarServidor() {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🌐 Servidor Web rodando na porta ${PORT}`);
  });
}

module.exports = iniciarServidor;
