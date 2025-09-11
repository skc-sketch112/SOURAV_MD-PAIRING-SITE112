const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

let sock; // global socket

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection } = update;
    if (connection === "open") console.log("✅ Bot Connected");
  });
}

startBot();

// POST route to generate pairing code
app.post("/pair", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!sock) return res.status(500).json({ error: "Socket not ready" });

    const code = await sock.requestPairingCode(phone);
    console.log("Pairing Code for", phone, ":", code);
    res.json({ code });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
