const { loadSettings, saveSettings } = require("./groupSettings");

const LEVEL_LABELS = {
    discord: {
        server: "Servidor",
        categoria: "Categoria",
        chat: "Canal / Thread"
    },
    whatsapp: {
        server: "Comunidade / Grupo Geral",
        chat: "Grupo"
    },
    telegram: {
        server: "Grupo / Canal",
        chat: "Tópico / Grupo"
    }
};

function getLevelLabel(platform, level) {
    return (LEVEL_LABELS[platform] || {})[level] || level;
}

function readAntipalavras(settingsObj) {
    const ap = settingsObj?.antipalavras || {};
    return {
        enabled: ap.enabled === true,
        action: ap.action || "delete",
        message: ap.message || null,
        ignoreParent: ap.ignoreParent === true,
        words: Array.isArray(ap.words) ? ap.words.filter(Boolean) : [],
        userWhitelist: Array.isArray(ap.userWhitelist) ? ap.userWhitelist : []
    };
}

function resolveAntipalavrasConfig(message) {
    const chain = buildChain(message);
    const active = [];

    for (const { level, config } of chain) {
        if (config.ignoreParent) {
            active.length = 0;
        }
        if (config.enabled) {
            active.push({ level, config });
        }
    }

    if (active.length === 0) return null;

    // Configuração mais específica (nível mais baixo ativo)
    const winner = active[active.length - 1];

    // Combina userWhitelist de TODOS os níveis ativos (union)
    const mergedUserWhitelist = [
        ...new Set(active.flatMap(({ config }) => config.userWhitelist || []))
    ];

    return {
        level: winner.level,
        config: { ...winner.config, userWhitelist: mergedUserWhitelist }
    };
}

function buildChain(message) {
    const { platform, chatId, threadId, raw } = message;
    const chain = [];

    if (platform === "discord") {
        const guildId = raw?.guild ? String(raw.guild.id) : null;
        if (!guildId) return chain;

        const serverData = loadSettings("discord", guildId, "server");
        chain.push({ level: "server", config: readAntipalavras(serverData.settings) });

        const channel = raw?.channel;
        const parentId = channel?.parentId || null;
        const isInCategory = parentId && !channel?.isThread?.();
        if (isInCategory && Array.isArray(serverData.categoria)) {
            const cat = serverData.categoria.find(c => c.id === parentId);
            if (cat) {
                chain.push({ level: "categoria", config: readAntipalavras(cat.settings) });
            }
        }

        const chanId = channel?.isThread?.()
            ? String(channel.parentId)
            : String(channel?.id || chatId);
        const chatSettings = findChatSettings(serverData, chanId);

        if (channel?.isThread?.()) {
            const threadSettings = chatSettings?.topico?.find(t => t.id === String(channel.id));
            chain.push({ level: "chat", config: readAntipalavras(chatSettings?.settings) });
            if (threadSettings) {
                chain.push({ level: "chat", config: readAntipalavras(threadSettings.settings) });
            }
        } else {
            chain.push({ level: "chat", config: readAntipalavras(chatSettings?.settings) });
        }

    } else if (platform === "whatsapp") {
        const isGroup = chatId?.endsWith("@g.us");
        if (!isGroup) return chain;

        const commFile = findWhatsAppCommunityFile(chatId);
        if (commFile) {
            const commData = loadSettings("whatsapp", commFile.communityId, "community");
            chain.push({ level: "server", config: readAntipalavras(commData.settings) });
            const groupInComm = (commData.chat || []).find(c => c.id === chatId);
            chain.push({ level: "chat", config: readAntipalavras(groupInComm?.settings) });
        } else {
            const groupData = loadSettings("whatsapp", chatId, "group");
            chain.push({ level: "server", config: readAntipalavras(groupData.settings) });
            chain.push({ level: "chat", config: readAntipalavras(groupData.settings) });
        }

    } else if (platform === "telegram") {
        const groupData = loadSettings("telegram", chatId, "group");
        chain.push({ level: "server", config: readAntipalavras(groupData.settings) });
        if (threadId && Array.isArray(groupData.topico)) {
            const topic = groupData.topico.find(t => t.id === String(threadId));
            if (topic) {
                chain.push({ level: "chat", config: readAntipalavras(topic.settings) });
            }
        }
    }

    return chain;
}

function findChatSettings(serverData, chanId) {
    if (Array.isArray(serverData.chat)) {
        const found = serverData.chat.find(c => c.id === chanId);
        if (found) return found;
    }
    if (Array.isArray(serverData.categoria)) {
        for (const cat of serverData.categoria) {
            if (Array.isArray(cat.chat)) {
                const found = cat.chat.find(c => c.id === chanId);
                if (found) return found;
            }
        }
    }
    return null;
}

const fs = require("fs");
const path = require("path");
const groupsDir = path.join(__dirname, "..", "settings", "groups");

function findWhatsAppCommunityFile(groupId) {
    if (!fs.existsSync(groupsDir)) return null;
    const files = fs.readdirSync(groupsDir);
    for (const file of files) {
        if (!file.startsWith("waC") || !file.endsWith(".json")) continue;
        try {
            const data = JSON.parse(fs.readFileSync(path.join(groupsDir, file), "utf8"));
            if (Array.isArray(data.chat) && data.chat.some(c => c.id === groupId)) {
                return { communityId: data.server };
            }
        } catch {}
    }
    return null;
}

function getSetAntipalavras(message, level, newConfig = null) {
    const { platform, chatId, threadId, raw } = message;

    if (platform === "discord") {
        const guildId = raw?.guild ? String(raw.guild.id) : null;
        if (!guildId) return null;
        const serverData = loadSettings("discord", guildId, "server");

        if (level === "server") {
            if (newConfig) {
                serverData.settings = serverData.settings || {};
                serverData.settings.antipalavras = { ...readAntipalavras(serverData.settings), ...newConfig };
                saveSettings("discord", guildId, "server", serverData, message);
            }
            return readAntipalavras(serverData.settings);
        }

        if (level === "categoria") {
            const parentId = raw?.channel?.parentId;
            if (!parentId) return null;
            const cat = (serverData.categoria || []).find(c => c.id === parentId);
            if (!cat) return null;
            if (newConfig) {
                cat.settings = cat.settings || {};
                cat.settings.antipalavras = { ...readAntipalavras(cat.settings), ...newConfig };
                saveSettings("discord", guildId, "server", serverData, message);
            }
            return readAntipalavras(cat.settings);
        }

        if (level === "chat") {
            const channel = raw?.channel;
            const isThread = channel?.isThread?.();
            const chanId = isThread ? String(channel.parentId) : String(channel?.id || chatId);
            const threadObjId = isThread ? String(channel.id) : null;
            const chatObj = findChatSettings(serverData, chanId);
            if (!chatObj) return null;

            if (threadObjId) {
                const topicObj = (chatObj.topico || []).find(t => t.id === threadObjId);
                if (!topicObj) return null;
                if (newConfig) {
                    topicObj.settings = topicObj.settings || {};
                    topicObj.settings.antipalavras = { ...readAntipalavras(topicObj.settings), ...newConfig };
                    saveSettings("discord", guildId, "server", serverData, message);
                }
                return readAntipalavras(topicObj.settings);
            }

            if (newConfig) {
                chatObj.settings = chatObj.settings || {};
                chatObj.settings.antipalavras = { ...readAntipalavras(chatObj.settings), ...newConfig };
                saveSettings("discord", guildId, "server", serverData);
            }
            return readAntipalavras(chatObj.settings);
        }
    }

    if (platform === "whatsapp") {
        const commFile = findWhatsAppCommunityFile(chatId);
        if (commFile) {
            const commData = loadSettings("whatsapp", commFile.communityId, "community");
            if (level === "server") {
                if (newConfig) {
                    commData.settings = commData.settings || {};
                    commData.settings.antipalavras = { ...readAntipalavras(commData.settings), ...newConfig };
                    saveSettings("whatsapp", commFile.communityId, "community", commData, message);
                }
                return readAntipalavras(commData.settings);
            }
            if (level === "chat") {
                const groupEntry = (commData.chat || []).find(c => c.id === chatId);
                if (!groupEntry) return null;
                if (newConfig) {
                    groupEntry.settings = groupEntry.settings || {};
                    groupEntry.settings.antipalavras = { ...readAntipalavras(groupEntry.settings), ...newConfig };
                    saveSettings("whatsapp", commFile.communityId, "community", commData, message);
                }
                return readAntipalavras(groupEntry.settings);
            }
        } else {
            const groupData = loadSettings("whatsapp", chatId, "group");
            if (newConfig) {
                groupData.settings = groupData.settings || {};
                groupData.settings.antipalavras = { ...readAntipalavras(groupData.settings), ...newConfig };
                saveSettings("whatsapp", chatId, "group", groupData, message);
            }
            return readAntipalavras(groupData.settings);
        }
    }

    if (platform === "telegram") {
        const groupData = loadSettings("telegram", chatId, "group");
        if (level === "server") {
            if (newConfig) {
                groupData.settings = groupData.settings || {};
                groupData.settings.antipalavras = { ...readAntipalavras(groupData.settings), ...newConfig };
                saveSettings("telegram", chatId, "group", groupData, message);
            }
            return readAntipalavras(groupData.settings);
        }
        if (level === "chat") {
            if (!threadId) return null;
            const topic = (groupData.topico || []).find(t => t.id === String(threadId));
            if (!topic) return null;
            if (newConfig) {
                topic.settings = topic.settings || {};
                topic.settings.antipalavras = { ...readAntipalavras(topic.settings), ...newConfig };
                saveSettings("telegram", chatId, "group", groupData, message);
            }
            return readAntipalavras(topic.settings);
        }
    }

    return null;
}

function getAvailableLevels(message) {
    const { platform, chatId, threadId, raw } = message;
    if (platform === "discord") {
        const levels = ["server"];
        const channel = raw?.channel;
        const parentId = channel?.parentId;
        const isThread = channel?.isThread?.();
        if (parentId && !isThread) levels.push("categoria");
        if (isThread && channel?.parentId) levels.push("categoria");
        levels.push("chat");
        return levels;
    }
    if (platform === "whatsapp") {
        if (!chatId?.endsWith("@g.us")) return [];
        const levels = [];
        const inComm = findWhatsAppCommunityFile(chatId);
        if (inComm) levels.push("server");
        levels.push("chat");
        return levels;
    }
    if (platform === "telegram") {
        const levels = ["server"];
        if (threadId) levels.push("chat");
        return levels;
    }
    return [];
}

function normalizeWords(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input.map(String).map(x => x.trim()).filter(Boolean);

    return String(input)
        .split(/[,\n]+/)
        .map(x => x.trim())
        .filter(Boolean);
}

function containsForbiddenWord(text, words) {
    if (!text || !words?.length) return false;
    const normalized = String(text).toLowerCase();
    return words.some(word => {
        const target = String(word).toLowerCase().trim();
        if (!target) return false;
        return normalized.includes(target);
    });
}

module.exports = {
    getLevelLabel,
    getAvailableLevels,
    getSetAntipalavras,
    resolveAntipalavrasConfig,
    readAntipalavras,
    normalizeWords,
    containsForbiddenWord
};
