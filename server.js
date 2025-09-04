const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(express.static("views"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

// Handle pairing request
app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: "Phone number required" });

  const sessionPath = path.join(__dirname, "sessions", number);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);

  try {
    const code = await sock.requestPairingCode(number);
    io.emit("pairing", { number, code }); // Send to frontend in real-time
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
