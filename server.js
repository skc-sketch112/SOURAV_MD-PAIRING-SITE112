const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(express.static("views"));

const sessions = {}; // store active sockets

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

// Pairing request
app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: "Phone number required" });

  const sessionPath = path.join(__dirname, "sessions", number);
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const sock = makeWASocket({ auth: state });

  sessions[number] = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log(`✅ Connected to WhatsApp: ${number}`);
    } else if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`❌ Disconnected from ${number}, reconnect: ${shouldReconnect}`);
      if (shouldReconnect) {
        delete sessions[number];
      }
    }
  });

  try {
    const code = await sock.requestPairingCode(number);
    io.emit("pairing", { number, code });
    res.json({ success: true, code });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Download session
app.get("/get-session/:number", (req, res) => {
  const { number } = req.params;
  const credsFile = path.join(__dirname, "sessions", number, "creds.json");

  if (!fs.existsSync(credsFile)) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.download(credsFile, `${number}-session.json`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
