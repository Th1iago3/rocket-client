// index.js
const {
  useMultiFileAuthState,
  DisconnectReason,
  makeWASocket,
  generateWAMessageFromContent
} = require("@angstvorfrauen/baileys");
const pino = require("pino");
const fs = require("fs").promises;
const Boom = require("@hapi/boom");
const express = require("express");
const crypto = require("crypto");
const app = express();
app.use(express.json());
// === ARQUIVO DE TOKENS ===
const TOKENS_FILE = "./tokens.json";
// === FUNÇÕES DE TOKENS ===
async function loadTokens() {
  try {
    const data = await fs.readFile(TOKENS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}
async function saveTokens(tokens) {
  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}
function generateUID() {
  return crypto.randomBytes(16).toString("hex");
}
function parseValidity(str) {
  const match = str.match(/^(\d+)([smhdwa])$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const units = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
    w: 604800000,
    a: 31536000000
  };
  return value * (units[unit] || 0);
}
async function checkToken(token) {
  if (token === "@inconfundivel") {
    return { valid: true, data: { maxRequests: Infinity, requestsToday: 0, expires: null, lastDay: new Date().toISOString().split("T")[0] } };
  }
  const tokens = await loadTokens();
  const entry = tokens[token];
  if (!entry) return null;
  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];
  // Reinicia contador diário
  if (entry.lastDay !== today) {
    entry.requestsToday = 0;
    entry.lastDay = today;
  }
  if (entry.requestsToday >= entry.maxRequests) {
    return { valid: false, error: "Limite diário excedido" };
  }
  if (entry.expires && now > entry.expires) {
    delete tokens[token];
    await saveTokens(tokens);
    return { valid: false, error: "Token expirado" };
  }
  entry.requestsToday++;
  await saveTokens(tokens);
  return { valid: true, data: entry };
}
// === BAILEYS ===
let sock;
let sessionExists = false;
const main = require("./main.js");
async function connectBot() {
  try {
    console.log("[BAILEYS] Iniciando conexão...");
    const { state, saveCreds } = await useMultiFileAuthState("./database/Session");
    sock = makeWASocket({
      printQRInTerminal: false,
      auth: state,
      logger: pino({ level: "silent" })
    });
    // === sendjson GLOBAL ===
    sock.sendjson = (jid, content, options = {}) => {
      const msg = generateWAMessageFromContent(jid, content, options);
      return sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
    };
    sessionExists = !!sock.authState?.creds?.registered;
    console.log(`[BAILEYS] Sessão existe? ${sessionExists}`);
    // === EVENTO DE MENSAGENS ===
    sock.ev.on("messages.upsert", async (chatUpdate) => {
      const m = chatUpdate.messages[0];
      if (!m.message || m.key.remoteJid === "status@broadcast" || m.key.id?.startsWith("BAE5")) return;
      try {
        await main.handler(sock, m, chatUpdate);
      } catch (err) {
        console.error("[HANDLER] Erro:", err.message);
      }
    });
    // === CONEXÃO ===
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      console.log(`[BAILEYS] Conexão: ${connection}`);
      if (connection === "close") {
        const reason = Boom.boomify(lastDisconnect?.error)?.output.statusCode;
        sessionExists = false;
        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
          await fs.rm("./database/Session", { recursive: true, force: true });
        }
        setTimeout(connectBot, 5000);
      } else if (connection === "open") {
        sessionExists = true;
        console.log("Bot conectado com sucesso!");
      }
    });
    sock.ev.on("creds.update", saveCreds);
  } catch (err) {
    console.error("[BAILEYS] Erro fatal:", err);
    setTimeout(connectBot, 10000);
  }
}
connectBot().catch(console.error);
// === APIs ===
app.get("/", (req, res) => {
  res.json({
    status: "online",
    XMLHttpRequestEventTarget: sessionExists ? "true" : "false",
    autor: "@inconfundivel"
  });
});
// === LISTAR TOKENS ===
app.get("/tokens", async (req, res) => {
  if (req.query.token !== "@inconfundivel") return res.status(401).json({ error: "Acesso negado" });
  const tokens = await loadTokens();
  const list = Object.keys(tokens).map(k => ({
    token: k,
    max_diario: tokens[k].maxRequests,
    usado_hoje: tokens[k].requestsToday,
    expira_em: tokens[k].expires ? new Date(tokens[k].expires).toLocaleString("pt-BR") : "Nunca",
    criado_por: tokens[k].createdBy
  }));
  res.json({ total: list.length, tokens: list });
});
// === CRIAR TOKEN ===
app.get("/addtoken", async (req, res) => {
  if (req.query.token !== "@inconfundivel") return res.status(401).json({ error: "Acesso negado" });
  const { validade, requests, add } = req.query;
  if (!validade || !requests || !add) {
    return res.status(400).json({ error: "Parâmetros: validade, requests, add" });
  }
  const maxRequests = parseInt(requests);
  if (isNaN(maxRequests) || maxRequests <= 0) {
    return res.status(400).json({ error: "requests deve ser número > 0" });
  }
  const expiresIn = parseValidity(validade);
  if (!expiresIn) {
    return res.status(400).json({ error: "validade inválida (ex: 1s, 1m, 1h, 1d, 1w, 1a)" });
  }
  const tokens = await loadTokens();
  let newToken;
  if (add === "all") {
    do {
      newToken = generateUID();
    } while (tokens[newToken]);
  } else {
    newToken = add;
    if (tokens[newToken]) return res.status(400).json({ error: "Token já existe" });
  }
  const today = new Date().toISOString().split("T")[0];
  tokens[newToken] = {
    maxRequests,
    requestsToday: 0,
    lastDay: today,
    expires: Date.now() + expiresIn,
    createdBy: "@inconfundivel"
  };
  await saveTokens(tokens);
  res.json({
    success: true,
    token_gerado: newToken,
    validade: validade,
    requests_por_dia: maxRequests,
    expira_em: new Date(Date.now() + expiresIn).toLocaleString("pt-BR"),
    criado_em: new Date().toLocaleString("pt-BR")
  });
});
// === DELETAR TOKEN ===
app.get("/deltoken", async (req, res) => {
  if (req.query.token !== "@inconfundivel") return res.status(401).json({ error: "Acesso negado" });
  const { del } = req.query;
  if (!del) return res.status(400).json({ error: "Parâmetro 'del' obrigatório" });
  const tokens = await loadTokens();
  if (!tokens[del]) return res.status(404).json({ error: "Token não encontrado" });
  delete tokens[del];
  await saveTokens(tokens);
  res.json({ success: true, message: `Token ${del} deletado com sucesso` });
});
// === CRASH iOS – RESPOSTA DETALHADA + VERIFICAÇÃO DE TOKEN ===
app.get("/crash-ios", async (req, res) => {
  const token = req.query.token;
  const num = req.query.query?.replace(/[^0-9]/g, "");
  if (!token || !num) {
    return res.status(400).json({ error: "Parâmetros obrigatórios: token e query (número)" });
  }
  if (!sessionExists) {
    return res.status(400).json({ error: "Bot não conectado" });
  }
  const targetJid = num + "@s.whatsapp.net";
  // === VERIFICA TOKEN (CORRIGIDO: evita null) ===
  const tokenCheck = await checkToken(token);
  if (!tokenCheck || !tokenCheck.valid) {
    return res.status(403).json({
      error: tokenCheck?.error || "Token inválido, expirado ou inexistente"
    });
  }
  try {
    // === BUSCA INFOS DO ALVO VIA MAIN.JS ===
    const targetInfo = await main.getContactInfo(sock, targetJid);
    console.log(`[CRASH] Enviando ponto para ${targetJid} (${targetInfo.name || "Desconhecido"}) via token ${token}...`);
    await sock.sendMessage(targetJid, { text: "." });
    const remaining = tokenCheck.data.maxRequests === Infinity ? "Ilimitado" : tokenCheck.data.maxRequests - tokenCheck.data.requestsToday;
    res.json({
      success: true,
      alvo: {
        jid: targetJid,
        existe: targetInfo.exists,
        nome: targetInfo.name,
        status_bio: targetInfo.status,
        ultima_visualizacao: targetInfo.lastSeen ? new Date(targetInfo.lastSeen).toLocaleString("pt-BR") : "Desconhecido",
        online: targetInfo.online ? "Sim" : "Não",
        foto_perfil: targetInfo.profilePic || "Nenhuma"
      },
      token: {
        id: token,
        requests_restantes: remaining,
        max_diario: tokenCheck.data.maxRequests === Infinity ? "Ilimitado" : tokenCheck.data.maxRequests,
        expira_em: tokenCheck.data.expires
          ? new Date(tokenCheck.data.expires).toLocaleString("pt-BR")
          : "Nunca"
      },
      autor: "inconfundivel",
      message: "Sucesso! Crash enviado com sucesso.",
      timestamp: new Date().toLocaleString("pt-BR")
    });
  } catch (err) {
    console.error("[API] Erro ao enviar ponto:", err.message);
    res.status(500).json({ error: "Falha interna no envio", details: err.message });
  }
});
// === STATUS ===
app.get("/status", (req, res) => {
  res.json({
    conectado: sessionExists,
    uptime: process.uptime().toFixed(2) + "s",
    timestamp: new Date().toLocaleString("pt-BR")
  });
});
// === CONECTAR (ADMIN) ===
app.get("/connect", async (req, res) => {
  if (req.query.token !== "@inconfundivel") return res.status(401).json({ error: "Acesso negado" });
  if (sessionExists) return res.status(400).json({ error: "Sessão já existe" });
  const num = req.query.query?.replace(/[^0-9]/g, "");
  if (!num) return res.status(400).json({ error: "Número inválido" });
  try {
    let code = await sock.requestPairingCode(num);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    res.json({ success: true, codigo: code, numero: num });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar código", details: err.message });
  }
});
// === DELETAR SESSÃO (ADMIN) ===
app.get("/deleteSession", async (req, res) => {
  if (req.query.token !== "@inconfundivel") return res.status(401).json({ error: "Acesso negado" });
  try {
    await fs.rm("./database/Session", { recursive: true, force: true });
    sessionExists = false;
    connectBot();
    res.json({ success: true, message: "Sessão deletada e reconectando..." });
  } catch (err) {
    res.status(500).json({ error: "Falha ao deletar sessão" });
  }
});
// === SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] API rodando em http://0.0.0.0:${PORT}`);
  console.log(`[INFO] Use /addtoken para criar tokens`);
});
