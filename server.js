import { Telegraf } from "telegraf";
import baileys from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const { default: makeWASocket, useMongoDBAuthState } = baileys;

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

bot.start((ctx) => {
  ctx.reply("👋 Welcome! Send me your WhatsApp number to get QR code.");
});

bot.on("text", async (ctx) => {
  const number = ctx.message.text.trim();
  ctx.reply(`📲 Okay, generating QR code for number: ${number}...`);

  const { state, saveCreds } = await useMongoDBAuthState(process.env.MONGO_URI, number);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    if (update.qr) {
      const qrImage = await qrcode.toBuffer(update.qr);
      await ctx.replyWithPhoto({ source: qrImage }, { caption: "🔑 Scan this QR with WhatsApp" });
    }
    if (update.connection === "open") {
      ctx.reply("✅ WhatsApp bot connected successfully!");
    }
    if (update.connection === "close") {
      ctx.reply("⚠️ Connection closed. Please try again.");
    }
  });
});

bot.launch();
