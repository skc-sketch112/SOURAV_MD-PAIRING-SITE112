const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Folder for saving sessions
const SESSION_DIR = path.join(__dirname, "sessions");
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR);
}

/**
 * Create a new WhatsApp connection and generate pairing code
 */
async function createConnection(number) {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(SESSION_DIR, number)
  );

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // we will return code instead
    browser: ["Render-Pairing", "Chrome", "1.0"],
  });

  // Save credentials when updated
  sock.ev.on("creds.update", saveCreds);

  return new Promise((resolve, reject) => {
    // Generate pairing code
    sock.waitForConnectionUpdate = true;

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        console.log("✅ Connected to WhatsApp:", number);
      } else if (connection === "close") {
        console.log("❌ Connection closed:", lastDisconnect?.error);
      }
    });

    sock.ev.on("connection.update", async (update) => {
      if (update.pairingCode) {
        console.log("✅ Pairing code:", update.pairingCode);
        resolve(update.pairingCode);
      }
    });

    // Request pairing code from WhatsApp
    sock
      .requestPairingCode(number)
      .then((code) => {
        if (code) resolve(code);
      })
      .catch(reject);
  });
}

// ================== ROUTES ==================

// Homepage
app.get("/", (req, res) => {
  res.send(`
    <h1>🚀 WhatsApp Pairing Service</h1>
    <p><b>POST</b> to <code>/pair</code> with JSON: <code>{ "number": "+91xxxxxxxxxx" }</code></p>
    <p>Then enter code in WhatsApp (Linked Devices > Link a Device > Enter Code).</p>
  `);
});

// Request pairing code
app.post("/pair", async (req, res) => {
  try {
    const number = req.body.number;
    if (!number) {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const code = await createConnection(number);
    res.json({ pairingCode: code });
  } catch (err) {
    console.error("Error generating code:", err);
    res.status(500).json({ error: "Error generating code" });
  }
});

// Download session
app.get("/get-session/:number", (req, res) => {
  const number = req.params.number;
  const dir = path.join(SESSION_DIR, number);

  if (!fs.existsSync(dir)) {
    return res.status(404).json({ error: "Session not found" });
  }

  const zipFile = path.join(SESSION_DIR, `${number}-session.zip`);
  const archiver = require("archiver");
  const output = fs.createWriteStream(zipFile);
  const archive = archiver("zip");

  output.on("close", () => {
    res.download(zipFile, `${number}-session.zip`, () => {
      fs.unlinkSync(zipFile);
    });
  });

  archive.pipe(output);
  archive.directory(dir, false);
  archive.finalize();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
