// index.js
const {
  useMultiFileAuthState,
  DisconnectReason,
  makeWASocket,
  jidDecode
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

async function connectBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./database/Session");
  sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: "silent" }),
  });

  sessionExists = sock.authState.creds.registered;

  sock.ev.on("messages.upsert", async (chatUpdate) => {
    const m = chatUpdate.messages[0];
    if (!m.message) return;
    if (m.key.remoteJid === "status@broadcast") return;
    if (m.key.id?.startsWith("BAE5")) return;

    const msg = m.message.ephemeralMessage?.message || m.message;
    require("./main.js")(sock, m, chatUpdate);
  });

  sock.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {};
      return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
    }
    return jid;
  };

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = Boom.boomify(lastDisconnect?.error)?.output.statusCode;
      sessionExists = false;
      if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
        fs.rmSync("./database/Session", { recursive: true, force: true });
      }
      connectBot();
    } else if (connection === "open") {
      sessionExists = true;
      console.log("Bot conectado com sucesso!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}
connectBot();

// === APIs em JSON (rota raiz) ===
app.get("/", (req, res) => {
  res.json({
    status: "online",
    bot: sessionExists ? "conectado" : "desconectado",
    token: "@xd",
    endpoints: {
      "/status": "GET → { connected: true }",
      "/connect?token=@xd&query=5582993708218": "Gera código de pareamento",
      "/deleteSession?token=@xd": "Deleta sessão",
      "/crash-ios?token=@xd&query=5582993708218": "Envia crash iOS (usa comando '.' no main.js)"
    },
    docs: "/docs"
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
    res.status(500).json({ error: "Erro ao gerar código", details: err.message });
  }
});

app.get("/deleteSession", (req, res) => {
  if (req.query.token !== "@xd") return res.status(401).json({ error: "Token inválido" });
  fs.rmSync("./database/Session", { recursive: true, force: true });
  sessionExists = false;
  connectBot();
  res.json({ success: "Sessão deletada" });
});

// === CRASH iOS via main.js (comando ".") ===
app.get("/crash-ios", async (req, res) => {
  if (req.query.token !== "@xd") return res.status(401).json({ error: "Token inválido" });
  if (!sessionExists) return res.status(400).json({ error: "Bot não conectado" });
  const num = req.query.query?.replace(/[^0-9]/g, "");
  if (!num) return res.status(400).json({ error: "Número inválido" });

  const target = num + "@s.whatsapp.net";

  try {
    // Simula mensagem com comando "."
    const fakeMessage = {
      key: { remoteJid: target, fromMe: true, id: "FAKE123" },
      message: { conversation: "." },
      pushName: "API"
    };

    // Chama o main.js com o comando "."
    require("./main.js")(sock, fakeMessage, { messages: [fakeMessage] });

    res.json({ success: true, target, message: "Crash iOS iniciado via main.js" });
  } catch (err) {
    res.status(500).json({ error: "Falha ao iniciar crash", details: err.message });
  }
});

app.get("/docs", (req, res) => {
  res.json({
    api: "RocketClient V4.1",
    token: "@xd",
    endpoints: {
      "GET /": "Retorna este JSON com APIs",
      "GET /status": "Status do bot",
      "GET /connect?token=@xd&query=NUMERO": "Gera código de pareamento",
      "GET /deleteSession?token=@xd": "Deleta sessão",
      "GET /crash-ios?token=@xd&query=NUMERO": "Envia crash iOS (via main.js)"
    },
    examples: {
      connect: "curl 'https://seu-app.onrender.com/connect?token=@xd&query=5582993708218'",
      crash: "curl 'https://seu-app.onrender.com/crash-ios?token=@xd&query=5582993708218'"
    }
  });
});

// === SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
