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
    ctx.reply(`📲 Okay, generating QR code for number: ${number}...`)

    const { state, saveCreds } = await useMultiFileAuthState("auth_" + number)
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    sock.ev.on("creds.update", saveCreds)
    sock.ev.on("connection.update", async (update) => {
        if (update.qr) {
            const qrImage = await qrcode.toBuffer(update.qr)
            await ctx.replyWithPhoto({ source: qrImage }, { caption: "🔑 Scan this QR with WhatsApp" })
        }
        if (update.connection === "open") {
            ctx.reply("✅ WhatsApp bot connected successfully!")
        }
    })
})

bot.launch()
