// server.js
const express = require("express");
const bodyParser = require("body-parser");
const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

async function startSock(number) {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  if (number) {
    try {
      let code = await sock.requestPairingCode(number);
      return code;
    } catch (err) {
      console.error("Error generating code:", err);
      return null;
    }
  }
  return null;
}

// ---------- FRONTEND ----------
app.get("/", (req, res) => {
  res.send(`
    <h1>🚀 WhatsApp Pairing Service</h1>
    <form onsubmit="event.preventDefault(); sendNumber();">
      <input type="text" id="number" placeholder="+91xxxxxxxxxx" required>
      <button type="submit">Get Pairing Code</button>
    </form>

    <script>
      async function sendNumber() {
        const number = document.getElementById("number").value;
        const res = await fetch('/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number })
        });
        const data = await res.json();
        if(data.pairingCode){
          alert("✅ Your Pairing Code: " + data.pairingCode);
        } else {
          alert("❌ Error generating code. Please try again.");
        }
      }
    </script>
  `);
});

// ---------- API ----------
app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) {
    return res.status(400).json({ error: "Number is required" });
  }

  const code = await startSock(number);
  if (code) {
    res.json({ pairingCode: code });
  } else {
    res.status(500).json({ error: "Failed to generate code" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
