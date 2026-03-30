const TelegramBot = require("node-telegram-bot-api");
const botController = require("./controllers/botControllers");

const startBot = () => {

  const bot = new TelegramBot(process.env.BOT_TOKEN, {
    polling: true,
  });

  botController(bot);

  console.log("🤖 Telegram Bot Started");
};

module.exports = startBot;