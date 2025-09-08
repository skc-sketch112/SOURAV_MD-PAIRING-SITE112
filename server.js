const { Telegraf } = require("telegraf")
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const qrcode = require("qrcode")
require("dotenv").config()

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.start((ctx) => {
    ctx.reply("👋 Welcome! Send me your WhatsApp number to get QR code.")
})

bot.on("text", async (ctx) => {
    const number = ctx.message.text.trim()
    ctx.reply(`📲 Okay, generating QR code for: ${number}...`)

    // 🔑 Fixed path
    const { state, saveCreds } = await useMultiFileAuthState("./auth")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ["SOURAV_MD", "Chrome", "1.0"] // custom device name
    })

    // ✅ Always save when creds update
    sock.ev.on("creds.update", async () => {
        console.log("🔐 Saving session...")
        await saveCreds()
    })

    // 📡 Listen for connection updates
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
            const reason = lastDisconnect?.error?.output?.statusCode
            console.log("❌ Disconnected:", reason)

            if (reason === DisconnectReason.loggedOut) {
                ctx.reply("⚠️ Logged out. Please delete `auth/` and re-scan QR.")
            } else {
                ctx.reply("⚠️ Connection closed, trying to reconnect...")
            }
        }
    })
})

bot.launch()
