const { Telegraf } = require("telegraf");
const { createSession } = require("./whatsapp");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) =>
  ctx.reply("👋 Welcome! Send me your phone number (e.g. +919876543210) to get your WhatsApp pairing code.")
);

bot.on("text", async (ctx) => {
  const phone = ctx.message.text.trim();

  if (!/^\+?\d+$/.test(phone)) {
    return ctx.reply("⚠️ Please send a valid phone number with country code.");
  }

  ctx.reply("🔄 Generating pairing code for " + phone + "...");

  try {
    const { code } = await createSession(phone);
    ctx.reply(
      `📲 Your WhatsApp Pairing Code:\n\n👉 *${code}* 👈\n\nOpen WhatsApp → Linked Devices → Link with phone number → enter this code.`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Failed to generate pairing code.");
  }
});

bot.launch();
console.log("🚀 Telegram bot is running...");
