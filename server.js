const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(express.static("views"));

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

// Pairing route
app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: "Phone number required" });

  const sessionPath = path.join(__dirname, "sessions", number);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  // WhatsApp socket
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["PairingSite", "Chrome", "1.0"],
    syncFullHistory: false,
    mobile: false,
    markOnlineOnConnect: false
  });

  sock.ev.on("creds.update", saveCreds);

  try {
    // remove "+" if user enters it
    const cleanNumber = number.replace("+", "");

    const code = await sock.requestPairingCode(cleanNumber);

    io.emit("pairing", { number, code });
    res.json({ success: true, code });
    console.log(`✅ Pairing code for ${number}: ${code}`);
  } catch (err) {
    io.emit("pairing-error", { number, error: err.message });
    res.json({ success: false, error: err.message });
    console.error("❌ Pairing error:", err.message);
  }
});

// Download session file
app.get("/get-session/:number", (req, res) => {
  const { number } = req.params;
  const credsFile = path.join(__dirname, "sessions", number, "creds.json");

  if (!fs.existsSync(credsFile)) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.download(credsFile, `${number}-session.json`);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
