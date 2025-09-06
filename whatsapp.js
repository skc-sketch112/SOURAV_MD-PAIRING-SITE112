const { makeWASocket, useMultiFileAuthState } = require("baileys");

async function createSession(phone) {
  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${phone}`);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  return new Promise(async (resolve, reject) => {
    try {
      const code = await sock.requestPairingCode(phone);
      console.log("📲 Pairing code for", phone, "=>", code);

      sock.ev.on("connection.update", (update) => {
        if (update.connection === "open") {
          console.log("✅ WhatsApp connected for", phone);
        }
        if (update.connection === "close") {
          console.log("❌ Connection closed for", phone);
        }
      });

      resolve({ code, sock });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { createSession };
