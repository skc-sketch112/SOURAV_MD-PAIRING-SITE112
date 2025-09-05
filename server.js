const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

// ✅ Correct way to import in CommonJS for Baileys 6.7.8
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Ensure sessions folder exists
const sessionsDir = path.join(__dirname, "sessions");
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir);
}

async function startSock(number) {
  const sessionPath = path.join(sessionsDir, number);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // don't show QR, we only use pairing codes
  });

  sock.ev.on("creds.update", saveCreds);

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(number);
    return code;
  } else {
    return "✅ Already paired!";
  }
}

// API endpoint: request pairing code
app.post("/pair", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) {
      return res.status(400).json({ success: false, error: "❌ Phone number required" });
    }

    const code = await startSock(number);
    res.json({ success: true, code });
  } catch (err) {
    console.error("Error generating code:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint: download session
app.get("/get-session/:number", (req, res) => {
  const { number } = req.params;
  const credsFile = path.join(sessionsDir, number, "creds.json");

  if (!fs.existsSync(credsFile)) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }

  res.download(credsFile, `${number}-session.json`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
