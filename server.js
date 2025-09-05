// server.js
const express = require("express");
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let sock; // keep socket globally

// Start Baileys socket
async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("sessions");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    console.log("Connection update:", connection, lastDisconnect);
  });

  return sock;
}

// Serve frontend form
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WhatsApp Pairing Service</title>
      </head>
      <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1>WhatsApp Pairing Service</h1>
        <form method="POST" action="/pair">
          <input type="text" name="number" placeholder="+919876543210" required style="padding:8px; width:250px;">
          <button type="submit" style="padding:8px 12px;">Get Pairing Code</button>
        </form>
      </body>
    </html>
  `);
});

// Generate pairing code
app.post("/pair", async (req, res) => {
  try {
    if (!sock) sock = await startSock();

    const number = req.body.number;
    if (!number) return res.status(400).send("Phone number required");

    const code = await sock.requestPairingCode(number);
    console.log("Pairing code:", code);

    res.send(`
      <html>
        <head><title>Pairing Code</title></head>
        <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          <h2>Your Pairing Code:</h2>
          <p style="font-size:24px; font-weight:bold;">${code}</p>
          <a href="/">Back</a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Error generating code:", err);
    res.status(500).send("Error generating code");
  }
});

// Keep Render web service alive
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Server started on port", PORT));
