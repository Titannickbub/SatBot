const fs = require("fs");
const path = require("path");
const configFn = require("./config");

const COMMANDS_SYSTEM_CONFIG_DIR = path.join(__dirname, "..", "commands", "system", "configurações");
const GLOBAL_FILE = path.join(COMMANDS_SYSTEM_CONFIG_DIR, "autorepo_G.json");
const SETTINGS_DIR = path.join(__dirname, "..", "settings");
const GROUPS_DIR = path.join(SETTINGS_DIR, "autorepo");
const LEGACY_GLOBAL_FILE = path.join(SETTINGS_DIR, "autorepo.json");

// Cooldown cache em memória por chat + gatilho (para evitar spam/loops)
const cooldownCache = new Map();

/**
 * Garante que as pastas necessárias existam.
 */
function ensureDirectories() {
    if (!fs.existsSync(COMMANDS_SYSTEM_CONFIG_DIR)) {
        fs.mkdirSync(COMMANDS_SYSTEM_CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(SETTINGS_DIR)) {
        fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }
    if (!fs.existsSync(GROUPS_DIR)) {
        fs.mkdirSync(GROUPS_DIR, { recursive: true });
    }
}

/**
 * Sanitiza o ID do chat para nome de arquivo seguro no Windows.
 */
function sanitizeFilename(id) {
    if (typeof id !== "string") return String(id || "");
    return id.replace(/[\\/:*?"<>|]/g, "_");
}

/**
 * Gera a chave/nome de arquivo único para o grupo baseado na plataforma.
 * No WhatsApp: por grupo
 * No Discord: por servidor (guild)
 * No Telegram: por grupo (com ou sem tópicos)
 * Comunidades e PVs retornam null.
 */
function getChatKey(message) {
    if (!message) return null;
    if (message.isPrivate) return null;
    if (message.isCommunity) return null;

    const platform = String(message.platform || "").toLowerCase();

    if (platform === "discord") {
        const guildId = message.guildId || message.raw?.guildId || message.raw?.guild?.id;
        if (!guildId) return null;
        return `discord_${sanitizeFilename(guildId)}.json`;
    }

    if (platform === "whatsapp") {
        const chatId = message.chatId || message.groupId || message.from;
        if (!chatId) return null;
        return `whatsapp_${sanitizeFilename(chatId)}.json`;
    }

    if (platform === "telegram") {
        const chatId = message.chatId || message.groupId || message.raw?.chat?.id;
        if (!chatId) return null;
        return `telegram_${sanitizeFilename(chatId)}.json`;
    }

    const genericId = message.guildId || message.chatId || message.groupId;
    if (!genericId) return null;
    return `${platform || "chat"}_${sanitizeFilename(genericId)}.json`;
}

/**
 * Respostas globais padrão que já saem de fábrica com o bot.
 */
const DEFAULT_GLOBAL_RESPONSES = [
    {
        id: "global_bom_dia",
        trigger: "bom dia",
        matchType: "exact",
        action: "reply",
        content: "{saudacao}, {user}! {emoji_saudacao} (Agora são {hora})",
        cooldown: 5
    },
    {
        id: "global_boa_tarde",
        trigger: "boa tarde",
        matchType: "exact",
        action: "reply",
        content: "{saudacao}, {user}! {emoji_saudacao} (Agora são {hora})",
        cooldown: 5
    },
    {
        id: "global_boa_noite",
        trigger: "boa noite",
        matchType: "exact",
        action: "reply",
        content: "{saudacao}, {user}! {emoji_saudacao} (Agora são {hora})",
        cooldown: 5
    },
    {
        id: "global_boa_madrugada",
        trigger: "boa madrugada",
        matchType: "exact",
        action: "reply",
        content: "{saudacao}, {user}! {emoji_saudacao} (Agora são {hora})",
        cooldown: 5
    },
    {
        id: "global_salve",
        trigger: "salve",
        matchType: "exact",
        action: "reply",
        content: "Salve, {user}! {saudacao}! Tmj 👊",
        cooldown: 5
    },
    {
        id: "global_oi",
        trigger: "oi",
        matchType: "exact",
        action: "reply",
        content: "Olá, {user}! {saudacao}! {emoji_saudacao} Tudo bem com você? (Agora são {hora})",
        cooldown: 5
    },
    {
        id: "global_ola",
        trigger: "ola",
        matchType: "exact",
        action: "reply",
        content: "Olá, {user}! {saudacao}! {emoji_saudacao} (Agora são {hora})",
        cooldown: 5
    },
    {
        id: "global_olá",
        trigger: "olá",
        matchType: "exact",
        action: "reply",
        content: "Olá, {user}! {saudacao}! {emoji_saudacao} (Agora são {hora})",
        cooldown: 5
    },
    {
        id: "global_que_horas",
        trigger: "que horas sao",
        matchType: "exact",
        action: "reply",
        content: "🕒 Olá, {user}! Agora são exatamente {hora} de {dia_semana}, {data}.",
        cooldown: 5
    },
    {
        id: "global_que_horas_acento",
        trigger: "que horas são",
        matchType: "exact",
        action: "reply",
        content: "🕒 Olá, {user}! Agora são exatamente {hora} de {dia_semana}, {data}.",
        cooldown: 5
    },
    {
        id: "global_certeza",
        trigger: "certeza",
        matchType: "contains",
        action: "react",
        content: "🤔",
        cooldown: 3
    },
    {
        id: "global_garanto",
        trigger: "garanto",
        matchType: "contains",
        action: "react",
        content: "🤔",
        cooldown: 3
    },
    {
        id: "global_to_falando",
        trigger: "to falando",
        matchType: "contains",
        action: "react",
        content: "🤔",
        cooldown: 3
    },
    {
        id: "global_e_vdd",
        trigger: "e vdd",
        matchType: "contains",
        action: "react",
        content: "🤔",
        cooldown: 3
    },
    {
        id: "global_e_verdade",
        trigger: "e verdade",
        matchType: "contains",
        action: "react",
        content: "🤔",
        cooldown: 3
    }
];

const DEFAULT_GLOBAL_DATA = {
    responses: DEFAULT_GLOBAL_RESPONSES
};

let globalCache = null;

/**
 * Carrega o catálogo global de respostas oficiais.
 */
function loadGlobal() {
    if (globalCache) return globalCache;
    ensureDirectories();

    if (!fs.existsSync(GLOBAL_FILE)) {
        if (fs.existsSync(LEGACY_GLOBAL_FILE)) {
            try {
                const legacyRaw = fs.readFileSync(LEGACY_GLOBAL_FILE, "utf8");
                const legacyParsed = JSON.parse(legacyRaw);
                globalCache = {
                    responses: Array.isArray(legacyParsed.responses) ? legacyParsed.responses : []
                };
                saveGlobal(globalCache);
                fs.unlinkSync(LEGACY_GLOBAL_FILE);
                return globalCache;
            } catch {}
        }
        globalCache = { ...DEFAULT_GLOBAL_DATA };
        saveGlobal(globalCache);
        return globalCache;
    }

    try {
        const raw = fs.readFileSync(GLOBAL_FILE, "utf8");
        const parsed = JSON.parse(raw);
        globalCache = {
            responses: Array.isArray(parsed.responses) ? parsed.responses : []
        };
    } catch {
        globalCache = { ...DEFAULT_GLOBAL_DATA };
    }

    return globalCache;
}

/**
 * Salva o catálogo global de respostas oficiais.
 */
function saveGlobal(data) {
    ensureDirectories();
    globalCache = {
        responses: Array.isArray(data.responses) ? data.responses : []
    };

    fs.writeFileSync(GLOBAL_FILE, JSON.stringify(globalCache, null, 4), "utf8");
    return globalCache;
}

/**
 * Carrega a configuração local do grupo.
 */
function loadGroup(message) {
    const key = getChatKey(message);
    if (!key) return null;

    ensureDirectories();
    const filePath = path.join(GROUPS_DIR, key);

    if (!fs.existsSync(filePath)) {
        return {
            enabled: false,
            useGlobal: true,
            responses: []
        };
    }

    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        return {
            enabled: parsed.enabled === true,
            useGlobal: parsed.useGlobal !== false,
            responses: Array.isArray(parsed.responses) ? parsed.responses : []
        };
    } catch {
        return {
            enabled: false,
            useGlobal: true,
            responses: []
        };
    }
}

/**
 * Salva a configuração local do grupo.
 */
function saveGroup(message, data) {
    const key = getChatKey(message);
    if (!key) return false;

    ensureDirectories();
    const filePath = path.join(GROUPS_DIR, key);

    const payload = {
        enabled: data.enabled === true,
        useGlobal: data.useGlobal !== false,
        responses: Array.isArray(data.responses) ? data.responses : []
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 4), "utf8");
    return true;
}

/**
 * Normaliza o texto para comparação (remover acentos, espaços extras, minúsculas).
 */
function normalizeText(text) {
    if (!text || typeof text !== "string") return "";
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

/**
 * Verifica se o texto da mensagem casa com o gatilho.
 */
function matchTrigger(messageText, triggerText, matchType = "exact") {
    const normMsg = normalizeText(messageText);
    const normTrig = normalizeText(triggerText);

    if (!normMsg || !normTrig) return false;

    if (matchType === "exact") {
        return normMsg === normTrig;
    }

    if (matchType === "starts") {
        return normMsg.startsWith(normTrig);
    }

    if (matchType === "contains") {
        // Se for contém, verifica se a palavra/frase está presente
        if (normMsg === normTrig) return true;
        const escaped = normTrig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(^|\\s|[.,!?;:])(${escaped})($|\\s|[.,!?;:])`, "i");
        return regex.test(normMsg) || normMsg.includes(normTrig);
    }

    return false;
}

/**
 * Extrai o nome do usuário com suporte a WhatsApp, Discord e Telegram.
 */
function extractUserName(message) {
    if (!message) return "usuário";

    const candidates = [
        message.username,
        message.displayName,
        message.pushName,
        message.name,
        message.sender?.name,
        message.sender?.username,
        message.sender?.displayName,
        message.sender?.pushName,
        message.author?.displayName,
        message.author?.globalName,
        message.author?.username,
        message.member?.displayName,
        message.member?.nickname,
        message.raw?.pushName,
        message.raw?.notify,
        message.raw?.author?.displayName,
        message.raw?.author?.username,
        message.raw?.from?.first_name,
        message.raw?.from?.username
    ];

    for (const cand of candidates) {
        if (typeof cand === "string" && cand.trim()) {
            return cand.trim();
        }
    }

    if (message.userId && typeof message.userId === "string") {
        const num = message.userId.split("@")[0].replace(/[^0-9]/g, "");
        if (num) return `@${num}`;
    }

    return "usuário";
}

/**
 * Substitui placeholders dinâmicos no texto da resposta.
 */
function renderContent(template, message) {
    if (!template || typeof template !== "string") return "";

    const botName = typeof configFn?.getBotName === "function" ? configFn.getBotName() : "Sat Bot";
    const userName = extractUserName(message);
    const chatName = message.chatName || message.groupName || message.serverName || message.raw?.chat?.title || "grupo";

    let timeShort = "";
    let timeFull = "";
    let dateStr = "";
    let weekdayStr = "";
    let saudacao = "Olá";
    let emojiSaudacao = "✨";

    try {
        const tz = typeof configFn?.getTimezone === "function" ? configFn.getTimezone() : "America/Sao_Paulo";
        const now = new Date();
        timeShort = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(now);
        timeFull = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
        dateStr = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
        weekdayStr = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long" }).format(now);

        const hourNum = parseInt(new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "numeric", hour12: false }).format(now), 10);
        if (hourNum >= 5 && hourNum < 12) {
            saudacao = "Bom dia";
            emojiSaudacao = "☀️";
        } else if (hourNum >= 12 && hourNum < 18) {
            saudacao = "Boa tarde";
            emojiSaudacao = "⛅";
        } else if (hourNum >= 18 && hourNum <= 23) {
            saudacao = "Boa noite";
            emojiSaudacao = "🌙";
        } else {
            saudacao = "Boa madrugada";
            emojiSaudacao = "🌌";
        }
    } catch {
        timeShort = "";
        timeFull = "";
        dateStr = "";
        weekdayStr = "";
        saudacao = "Olá";
        emojiSaudacao = "✨";
    }

    return template
        .replace(/\{user\}/gi, userName)
        .replace(/\{usuario\}/gi, userName)
        .replace(/\{usuário\}/gi, userName)
        .replace(/\{nome\}/gi, userName)
        .replace(/\{mention\}/gi, userName)
        .replace(/\{bot\}/gi, botName)
        .replace(/\{chat\}/gi, chatName)
        .replace(/\{grupo\}/gi, chatName)
        .replace(/\{servidor\}/gi, chatName)
        .replace(/\{hora\}/gi, timeShort)
        .replace(/\{horario\}/gi, timeShort)
        .replace(/\{horário\}/gi, timeShort)
        .replace(/\{horas\}/gi, timeFull)
        .replace(/\{hora_completa\}/gi, timeFull)
        .replace(/\{data\}/gi, dateStr)
        .replace(/\{data_hora\}/gi, `${dateStr} ${timeShort}`)
        .replace(/\{datahora\}/gi, `${dateStr} ${timeShort}`)
        .replace(/\{semana\}/gi, weekdayStr)
        .replace(/\{dia_semana\}/gi, weekdayStr)
        .replace(/\{saudacao\}/gi, saudacao)
        .replace(/\{saudação\}/gi, saudacao)
        .replace(/\{emoji_saudacao\}/gi, emojiSaudacao)
        .replace(/\{emoji_saudação\}/gi, emojiSaudacao);
}

/**
 * Verifica e aplica cooldown para o gatilho no chat.
 */
function checkAndApplyCooldown(chatKey, triggerId, cooldownSeconds = 5) {
    const key = `${chatKey}:${triggerId}`;
    const now = Date.now();
    const expiresAt = cooldownCache.get(key) || 0;

    if (now < expiresAt) {
        return false; // Em cooldown
    }

    const duration = Math.max(1, Number(cooldownSeconds) || 5) * 1000;
    cooldownCache.set(key, now + duration);

    // Limpa registros antigos periodicamente
    if (cooldownCache.size > 2000) {
        for (const [k, exp] of cooldownCache.entries()) {
            if (now > exp) cooldownCache.delete(k);
        }
    }

    return true;
}

/**
 * Busca a melhor resposta para uma mensagem no chat atual.
 * Prioridade: Resposta Local do Grupo > Resposta Global.
 */
function findMatchingResponse(message, text) {
    if (!text || typeof text !== "string") return null;
    if (message.isPrivate || message.isCommunity) return null;

    const chatKey = getChatKey(message);
    if (!chatKey) return null;

    const groupConfig = loadGroup(message);
    if (!groupConfig || groupConfig.enabled === false) {
        return null; // Autoresposta desativada no grupo
    }

    // 1. Testa respostas locais do grupo
    const localResponses = groupConfig.responses || [];
    for (const item of localResponses) {
        if (!item || !item.trigger || !item.content) continue;
        if (matchTrigger(text, item.trigger, item.matchType || "exact")) {
            if (!checkAndApplyCooldown(chatKey, item.id || item.trigger, item.cooldown || 5)) {
                return null;
            }
            return {
                scope: "local",
                action: item.action === "react" ? "react" : "reply",
                content: item.action === "react" ? item.content : renderContent(item.content, message),
                rawItem: item
            };
        }
    }

    // 2. Se não encontrou local e o grupo permite globais, testa as respostas globais do catálogo oficial
    if (groupConfig.useGlobal !== false) {
        const globalData = loadGlobal();
        const globalResponses = globalData.responses || [];
        for (const item of globalResponses) {
            if (!item || !item.trigger || !item.content) continue;
            if (matchTrigger(text, item.trigger, item.matchType || "exact")) {
                if (!checkAndApplyCooldown(chatKey, `global_${item.id || item.trigger}`, item.cooldown || 5)) {
                    return null;
                }
                return {
                    scope: "global",
                    action: item.action === "react" ? "react" : "reply",
                    content: item.action === "react" ? item.content : renderContent(item.content, message),
                    rawItem: item
                };
            }
        }
    }

    return null;
}

/**
 * Adiciona ou substitui uma resposta local no grupo.
 */
function addGroupResponse(message, { trigger, action = "reply", content, matchType = "exact", cooldown = 5 }) {
    const config = loadGroup(message);
    if (!config) return false;

    const normTrigger = String(trigger || "").trim();
    if (!normTrigger || !content) return false;

    const id = `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEntry = {
        id,
        trigger: normTrigger,
        matchType: ["exact", "contains", "starts"].includes(matchType) ? matchType : "exact",
        action: action === "react" ? "react" : "reply",
        content: String(content).trim(),
        cooldown: Math.max(1, Number(cooldown) || 5)
    };

    // Remove gatilho idêntico anterior se já existir
    const filtered = (config.responses || []).filter(
        item => normalizeText(item.trigger) !== normalizeText(normTrigger)
    );

    filtered.push(newEntry);
    config.responses = filtered;

    saveGroup(message, config);
    return newEntry;
}

/**
 * Remove uma resposta local do grupo pelo gatilho ou ID.
 */
function removeGroupResponse(message, triggerOrId) {
    const config = loadGroup(message);
    if (!config || !Array.isArray(config.responses)) return false;

    const search = normalizeText(triggerOrId);
    const initialLen = config.responses.length;

    config.responses = config.responses.filter(item => {
        return item.id !== triggerOrId && normalizeText(item.trigger) !== search;
    });

    if (config.responses.length !== initialLen) {
        saveGroup(message, config);
        return true;
    }

    return false;
}

/**
 * Limpa todas as respostas locais do grupo.
 */
function clearGroupResponses(message) {
    const config = loadGroup(message);
    if (!config) return false;

    config.responses = [];
    saveGroup(message, config);
    return true;
}

/**
 * Adiciona ou substitui uma resposta global oficial (apenas SU).
 */
function addGlobalResponse({ trigger, action = "reply", content, matchType = "exact", cooldown = 5 }) {
    const globalData = loadGlobal();
    const normTrigger = String(trigger || "").trim();
    if (!normTrigger || !content) return false;

    const id = `global_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEntry = {
        id,
        trigger: normTrigger,
        matchType: ["exact", "contains", "starts"].includes(matchType) ? matchType : "exact",
        action: action === "react" ? "react" : "reply",
        content: String(content).trim(),
        cooldown: Math.max(1, Number(cooldown) || 5)
    };

    const filtered = (globalData.responses || []).filter(
        item => normalizeText(item.trigger) !== normalizeText(normTrigger)
    );

    filtered.push(newEntry);
    globalData.responses = filtered;

    saveGlobal(globalData);
    return newEntry;
}

/**
 * Remove uma resposta global oficial (apenas SU).
 */
function removeGlobalResponse(triggerOrId) {
    const globalData = loadGlobal();
    if (!Array.isArray(globalData.responses)) return false;

    const search = normalizeText(triggerOrId);
    const initialLen = globalData.responses.length;

    globalData.responses = globalData.responses.filter(item => {
        return item.id !== triggerOrId && normalizeText(item.trigger) !== search;
    });

    if (globalData.responses.length !== initialLen) {
        saveGlobal(globalData);
        return true;
    }

    return false;
}

module.exports = {
    getChatKey,
    loadGlobal,
    saveGlobal,
    loadGroup,
    saveGroup,
    findMatchingResponse,
    addGroupResponse,
    removeGroupResponse,
    clearGroupResponses,
    addGlobalResponse,
    removeGlobalResponse,
    renderContent,
    matchTrigger,
    normalizeText
};
