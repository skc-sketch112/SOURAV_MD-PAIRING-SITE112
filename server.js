// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import makeWASocket, { useMongoDBAuthState } from "@whiskeysockets/baileys";
import qrcode from "qrcode";

dotenv.config();

const app = express();
app.use(express.json());

// =======================
// MongoDB Connection
// =======================
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ MONGO_URI is missing in .env file");
  process.exit(1);
}

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully!"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// =======================
// Telegram Bot Setup
// =======================
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is missing in .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("👋 Welcome! Send me your WhatsApp number to get QR code.");
});

bot.on("text", async (ctx) => {
  const number = ctx.message.text.trim();
  ctx.reply(`📲 Generating QR code for number: ${number}...`);

  try {
    const { state, saveCreds } = await useMongoDBAuthState(mongoURI);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      if (update.qr) {
        const qrImage = await qrcode.toBuffer(update.qr);
        await ctx.replyWithPhoto(
          { source: qrImage },
          { caption: "🔑 Scan this QR with WhatsApp" }
        );
      }
      if (update.connection === "open") {
        ctx.reply("✅ WhatsApp bot connected successfully!");
      }
      if (update.connection === "close") {
        ctx.reply("❌ Connection closed, try again.");
      }
    });
  } catch (err) {
    console.error("Error creating WhatsApp socket:", err);
    ctx.reply("❌ Failed to generate QR code.");
  }
});

// =======================
// Start Telegram Bot
// =======================
bot.launch();
console.log("🤖 Telegram bot started");

// =======================
// Express Server (Optional API)
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
