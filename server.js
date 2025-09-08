const { Telegraf } = require("telegraf")
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const qrcode = require("qrcode")
require("dotenv").config()

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.start((ctx) => {
    ctx.reply("👋 Welcome! Send me your WhatsApp number to get QR code.")
})

bot.on("text", async (ctx) => {
    const number = ctx.message.text.trim()
    ctx.reply(`📲 Okay, generating QR code for: ${number}...`)

    // 🔑 Always use a fixed folder for saving session
    const { state, saveCreds } = await useMultiFileAuthState("./auth")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    // ✅ Save creds when updated
    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", async (update) => {
        const { qr, connection, lastDisconnect } = update

        if (qr) {
            const qrImage = await qrcode.toBuffer(qr)
            await ctx.replyWithPhoto({ source: qrImage }, { caption: "🔑 Scan this QR with WhatsApp" })
        }

        if (connection === "open") {
            ctx.reply("✅ WhatsApp bot connected successfully! Session saved 🎉")
        }

        if (connection === "close") {
            ctx.reply("⚠️ Connection closed, please restart and scan QR again.")
            console.log("❌ Disconnected:", lastDisconnect?.error)
        }
    })
})

bot.launch()
