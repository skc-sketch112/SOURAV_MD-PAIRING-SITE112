const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const path = require("path");

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "test-session"));

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // no QR needed
    browser: ["Ubuntu", "Chrome", "20.0.04"], // fake device info
    syncFullHistory: false,
    mobile: false, // IMPORTANT: false for pairing code
    markOnlineOnConnect: false
  });

  sock.ev.on("creds.update", saveCreds);

  // replace with your number in international format, no +
  const phoneNumber = "91XXXXXXXXXX";

  try {
    const code = await sock.requestPairingCode(phoneNumber);
    console.log("📲 Pairing code:", code);
  } catch (err) {
    console.error("❌ Error generating code:", err);
  }
}

start();
