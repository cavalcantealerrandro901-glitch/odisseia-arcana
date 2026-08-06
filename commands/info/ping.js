module.exports = {
  name: 'ping',
  description: 'Mede a latência do bot',
  async execute(message, args, client) {
    return message.reply(`🏓 **Pong!** Latência: **${client.ws.ping}ms**`);
  },
};
