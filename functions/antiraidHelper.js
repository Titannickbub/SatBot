const fs = require("fs");
const path = require("path");
const { loadSettings, saveSettings } = require("./groupSettings");

const file = path.join(__dirname, "..", "settings", "antiraid.json");

const DEFAULT_ANTI_RAID = {
    enabled: false,
    global: {
        alertAdmins: true,
        autoDelete: true,
        maxWarnings: 3,
        ignoreAdmins: true,
        ignoreOwners: true
    },
    telegram: {
        enabled: true,
        groupId: null,
        applyToTopics: true,
        maxMessagesPerWindow: 8,
        windowSeconds: 12,
        repeatedMessageLimit: 4,
        inviteLimit: 2,
        linkLimit: 3,
        mentionLimit: 6,
        webhookLimit: 0,
        action: "mute"
    },
    whatsapp: {
        enabled: false,
        groupOnly: true,
        communityBypass: true,
        maxMessagesPerWindow: 8,
        windowSeconds: 15,
        repeatedMessageLimit: 3,
        linkLimit: 2,
        action: "remove"
    },
    discord: {
        enabled: true,
        serverOnly: true,
        applyToAllChannels: true,
        maxMessagesPerWindow: 6,
        windowSeconds: 10,
        mentionLimit: 6,
        webhookLimit: 2,
        inviteLimit: 2,
        action: "timeout"
    }
};

function normalizeAntiRaidConfig(data) {
    const source = data && typeof data === "object" ? data : {};
    const normalized = JSON.parse(JSON.stringify(DEFAULT_ANTI_RAID));
    function mergeDeep(target, incoming) {
        if (!incoming || typeof incoming !== "object") return target;
        for (const key of Object.keys(incoming)) {
            const value = incoming[key];
            if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
                target[key] = mergeDeep(target[key], value);
            } else {
                target[key] = value;
            }
        }
        return target;
    }
    return mergeDeep(normalized, source);
}

function ensureFile() {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(DEFAULT_ANTI_RAID, null, 4), "utf8");
    }
}

function getAntiRaidConfig() {
    try {
        ensureFile();
        const raw = fs.readFileSync(file, "utf8");
        return normalizeAntiRaidConfig(JSON.parse(raw));
    } catch (err) {
        console.warn("[ANTI-RAID] Config inválida ou ausente, usando defaults.", err.message || err);
        return JSON.parse(JSON.stringify(DEFAULT_ANTI_RAID));
    }
}

function saveAntiRaidConfig(config) {
    const normalized = normalizeAntiRaidConfig(config);
    fs.writeFileSync(file, JSON.stringify(normalized, null, 4), "utf8");
    return normalized;
}

function readAntiRaid(settingsObj) {
    const anti = settingsObj?.antiraid || {};
    return {
        enabled: anti.enabled === true,
        action: anti.action || "mute",
        maxMessagesPerWindow: Number.isFinite(anti.maxMessagesPerWindow) ? anti.maxMessagesPerWindow : 8,
        windowSeconds: Number.isFinite(anti.windowSeconds) ? anti.windowSeconds : 12,
        repeatedMessageLimit: Number.isFinite(anti.repeatedMessageLimit) ? anti.repeatedMessageLimit : 4,
        inviteLimit: Number.isFinite(anti.inviteLimit) ? anti.inviteLimit : 2,
        linkLimit: Number.isFinite(anti.linkLimit) ? anti.linkLimit : 3,
        mentionLimit: Number.isFinite(anti.mentionLimit) ? anti.mentionLimit : 6,
        webhookLimit: Number.isFinite(anti.webhookLimit) ? anti.webhookLimit : 0,
        groupId: anti.groupId || null,
        applyToTopics: anti.applyToTopics !== false,
        serverOnly: anti.serverOnly !== false,
        communityBypass: anti.communityBypass !== false,
        groupOnly: anti.groupOnly !== false,
        userWhitelist: Array.isArray(anti.userWhitelist) ? anti.userWhitelist : [],
        userBlacklist: Array.isArray(anti.userBlacklist) ? anti.userBlacklist : [],
        roleWhitelist: Array.isArray(anti.roleWhitelist) ? anti.roleWhitelist : [],
        roleBlacklist: Array.isArray(anti.roleBlacklist) ? anti.roleBlacklist : []
    };
}

function resolveAntiRaidConfig(message) {
    const chain = buildAntiRaidChain(message);
    if (!chain.length) return null;

    const active = [];
    for (const item of chain) {
        if (item.config.enabled) active.push(item);
    }

    if (!active.length) return null;
    const winner = active[active.length - 1];

    const mergedUserWhitelist = [...new Set(active.flatMap(({ config }) => config.userWhitelist || []))];
    const mergedUserBlacklist = [...new Set(active.flatMap(({ config }) => config.userBlacklist || []))];
    const mergedRoleWhitelist = [...new Set(active.flatMap(({ config }) => config.roleWhitelist || []))];
    const mergedRoleBlacklist = [...new Set(active.flatMap(({ config }) => config.roleBlacklist || []))];

    return {
        level: winner.level,
        config: {
            ...winner.config,
            userWhitelist: mergedUserWhitelist,
            userBlacklist: mergedUserBlacklist,
            roleWhitelist: mergedRoleWhitelist,
            roleBlacklist: mergedRoleBlacklist
        }
    };
}

function buildAntiRaidChain(message) {
    const { platform, chatId, threadId, raw } = message;
    const chain = [];

    if (platform === "discord") {
        const guildId = raw?.guild?.id || message.guildId || message.serverId;
        if (!guildId) return chain;
        const serverData = loadSettings("discord", String(guildId), "server");
        chain.push({ level: "server", config: readAntiRaid(serverData.settings) });

        const channel = raw?.channel;
        const parentId = channel?.parentId || null;
        const isThread = !!channel?.isThread?.();
        const targetId = isThread ? String(channel.parentId) : String(channel?.id || chatId);

        if (parentId && !isThread && Array.isArray(serverData.categoria)) {
            const cat = serverData.categoria.find(c => c.id === parentId);
            if (cat) chain.push({ level: "categoria", config: readAntiRaid(cat.settings) });
        }

        let chatObj = null;
        if (Array.isArray(serverData.chat)) {
            chatObj = serverData.chat.find(c => c.id === targetId) || null;
        }
        if (!chatObj && Array.isArray(serverData.categoria)) {
            for (const cat of serverData.categoria) {
                if (Array.isArray(cat.chat)) {
                    const found = cat.chat.find(c => c.id === targetId);
                    if (found) {
                        chatObj = found;
                        break;
                    }
                }
            }
        }

        if (chatObj) {
            chain.push({ level: "chat", config: readAntiRaid(chatObj.settings) });
            if (isThread && threadId) {
                const topic = (chatObj.topico || []).find(t => t.id === String(threadId));
                if (topic) chain.push({ level: "chat", config: readAntiRaid(topic.settings) });
            }
        }
    }

    if (platform === "telegram") {
        const targetId = chatId || raw?.chat?.id;
        if (!targetId) return chain;
        const groupData = loadSettings("telegram", String(targetId), "group");
        chain.push({ level: "server", config: readAntiRaid(groupData.settings) });
        if (threadId && Array.isArray(groupData.topico)) {
            const topic = groupData.topico.find(t => t.id === String(threadId));
            if (topic) chain.push({ level: "chat", config: readAntiRaid(topic.settings) });
        }
    }

    if (platform === "whatsapp") {
        if (!chatId || !String(chatId).endsWith("@g.us")) return chain;
        const groupData = loadSettings("whatsapp", String(chatId), "group");
        chain.push({ level: "chat", config: readAntiRaid(groupData.settings) });
    }

    return chain;
}

function getSetAntiRaid(message, level, newConfig = null) {
    const { platform, chatId, threadId, raw } = message;

    if (platform === "discord") {
        const guildId = raw?.guild?.id || message.guildId || message.serverId;
        if (!guildId) return null;
        const serverData = loadSettings("discord", String(guildId), "server");

        if (level === "server") {
            if (newConfig) {
                serverData.settings = serverData.settings || {};
                serverData.settings.antiraid = { ...readAntiRaid(serverData.settings), ...newConfig };
                saveSettings("discord", String(guildId), "server", serverData, message);
            }
            return readAntiRaid(serverData.settings);
        }

        if (level === "categoria") {
            const parentId = raw?.channel?.parentId;
            if (!parentId) return null;
            const cat = (serverData.categoria || []).find(c => c.id === parentId);
            if (!cat) return null;
            if (newConfig) {
                cat.settings = cat.settings || {};
                cat.settings.antiraid = { ...readAntiRaid(cat.settings), ...newConfig };
                saveSettings("discord", String(guildId), "server", serverData, message);
            }
            return readAntiRaid(cat.settings);
        }

        if (level === "chat") {
            const channel = raw?.channel;
            const isThread = !!channel?.isThread?.();
            const targetId = isThread ? String(channel.parentId) : String(channel?.id || chatId);
            const threadObjId = isThread ? String(channel.id) : null;
            let chatObj = null;
            if (Array.isArray(serverData.chat)) chatObj = serverData.chat.find(c => c.id === targetId) || null;
            if (!chatObj && Array.isArray(serverData.categoria)) {
                for (const cat of serverData.categoria) {
                    if (Array.isArray(cat.chat)) {
                        const found = cat.chat.find(c => c.id === targetId);
                        if (found) { chatObj = found; break; }
                    }
                }
            }
            if (!chatObj) return null;

            if (threadObjId) {
                const topicObj = (chatObj.topico || []).find(t => t.id === threadObjId);
                if (!topicObj) return null;
                if (newConfig) {
                    topicObj.settings = topicObj.settings || {};
                    topicObj.settings.antiraid = { ...readAntiRaid(topicObj.settings), ...newConfig };
                    saveSettings("discord", String(guildId), "server", serverData, message);
                }
                return readAntiRaid(topicObj.settings);
            }

            if (newConfig) {
                chatObj.settings = chatObj.settings || {};
                chatObj.settings.antiraid = { ...readAntiRaid(chatObj.settings), ...newConfig };
                saveSettings("discord", String(guildId), "server", serverData, message);
            }
            return readAntiRaid(chatObj.settings);
        }
    }

    if (platform === "telegram") {
        const targetId = chatId || raw?.chat?.id;
        if (!targetId) return null;
        const groupData = loadSettings("telegram", String(targetId), "group");

        if (level === "server") {
            if (newConfig) {
                groupData.settings = groupData.settings || {};
                groupData.settings.antiraid = { ...readAntiRaid(groupData.settings), ...newConfig };
                saveSettings("telegram", String(targetId), "group", groupData, message);
            }
            return readAntiRaid(groupData.settings);
        }

        if (level === "chat") {
            if (!threadId) return null;
            const topic = (groupData.topico || []).find(t => t.id === String(threadId));
            if (!topic) return null;
            if (newConfig) {
                topic.settings = topic.settings || {};
                topic.settings.antiraid = { ...readAntiRaid(topic.settings), ...newConfig };
                saveSettings("telegram", String(targetId), "group", groupData, message);
            }
            return readAntiRaid(topic.settings);
        }
    }

    if (platform === "whatsapp") {
        if (!chatId || !String(chatId).endsWith("@g.us")) return null;
        const groupData = loadSettings("whatsapp", String(chatId), "group");
        if (level === "chat") {
            if (newConfig) {
                groupData.settings = groupData.settings || {};
                groupData.settings.antiraid = { ...readAntiRaid(groupData.settings), ...newConfig };
                saveSettings("whatsapp", String(chatId), "group", groupData, message);
            }
            return readAntiRaid(groupData.settings);
        }
    }

    return null;
}

function shouldApplyAntiRaid(message) {
    if (!message || !message.platform) return false;
    if (message.isPrivate) return false;

    const resolved = resolveAntiRaidConfig(message);
    if (!resolved) return false;
    if (resolved.config.enabled !== true) return false;

    const platform = message.platform;
    if (platform === "telegram") {
        const cfg = resolved.config;
        if (cfg.groupId && String(cfg.groupId) !== String(message.chatId)) return false;
        return true;
    }

    if (platform === "whatsapp") {
        if (message.isCommunity && resolved.config.communityBypass !== false) return false;
        return true;
    }

    if (platform === "discord") {
        return true;
    }

    return false;
}

function evaluateAntiRaid(message, options = {}) {
    const safeMessage = message || {};
    const platform = safeMessage.platform || options.platform || "unknown";
    const resolved = resolveAntiRaidConfig(safeMessage) || { config: {} };
    const settings = { ...DEFAULT_ANTI_RAID[platform], ...resolved.config };

    if (!shouldApplyAntiRaid(safeMessage)) {
        return { allowed: true, reason: "outside_scope", platform, risk: 0, action: "none", shouldDelete: false };
    }

    const text = String(safeMessage.text || "").trim();
    const userId = safeMessage.userId || safeMessage.sender?.id || "unknown";

    const risk = { repeated: 0, mentions: 0, links: 0, webhook: 0, invite: 0, burst: 0 };
    if (text) {
        const normalized = text.toLowerCase();
        if (settings.mentionLimit && (normalized.match(/@/g) || []).length >= settings.mentionLimit) risk.mentions = 1;
        if (settings.linkLimit && (normalized.match(/https?:\/\//gi) || []).length >= settings.linkLimit) risk.links = 1;
        if (settings.inviteLimit && /discord\.gg|t\.me|wa\.me|chat\.whatsapp\.com/.test(normalized) && (normalized.match(/discord\.gg|t\.me|wa\.me|chat\.whatsapp\.com/gi) || []).length >= settings.inviteLimit) risk.invite = 1;
        if (settings.webhookLimit && settings.webhookLimit > 0 && /webhook|hook/i.test(normalized)) risk.webhook = 1;
    }

    if (safeMessage.isWebhook === true || safeMessage.raw?.webhookId || safeMessage.raw?.webhook || safeMessage.webhook) risk.webhook = 1;
    const totalRisk = Object.values(risk).reduce((sum, value) => sum + value, 0);

    let action = "none";
    if (totalRisk >= 2 || (settings.webhookLimit && risk.webhook)) action = settings.action || "mute";

    return {
        allowed: action === "none",
        reason: action === "none" ? "normal" : "risk_detected",
        platform,
        risk: totalRisk,
        action,
        shouldDelete: action !== "none",
        userId
    };
}

module.exports = {
    DEFAULT_ANTI_RAID,
    getAntiRaidConfig,
    saveAntiRaidConfig,
    readAntiRaid,
    resolveAntiRaidConfig,
    getSetAntiRaid,
    shouldApplyAntiRaid,
    evaluateAntiRaid
};
