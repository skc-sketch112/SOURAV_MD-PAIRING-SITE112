import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import qrcode from "qrcode";
import { Telegraf } from "telegraf";

// ✅ Fix for Baileys CommonJS
import pkg from "@whiskeysockets/baileys";
const { default: makeWASocket, useMongoDBAuthState } = pkg;

dotenv.config();

// ====== EXPRESS SERVER (keep Render alive) ======
const app = express();
app.get("/", (req, res) => {
  res.send("✅ SOURAV_MD Pairing Site is running!");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

// ====== MONGODB CONNECTION ======
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error("❌ MONGODB_URI is not defined in .env file!");
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ====== TELEGRAM BOT ======
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("👋 Welcome! Send me your WhatsApp number to get QR code.");
});

bot.on("text", async (ctx) => {
  const number = ctx.message.text.trim();
  ctx.reply(`📲 Okay, generating QR code for number: ${number}...`);

  try {
    // use MongoDB Auth State
    const { state, saveCreds } = await useMongoDBAuthState(mongoose.connection.db, "sessions_" + number);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
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
        ctx.reply("❌ Connection closed. Please try again.");
      }
    });
  } catch (err) {
    console.error("⚠️ Error:", err);
    ctx.reply("❌ Failed to generate QR code. Please try again later.");
  }
});

bot.launch().then(() => console.log("🤖 Telegram bot started successfully"));
