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

const ALL_MEDIA_TYPES = [
    "image",
    "video",
    "audio",
    "document",
    "sticker",
    "location",
    "contact",
    "voice",
    "gif"
];

function getLevelLabel(platform, level) {
    return (LEVEL_LABELS[platform] || {})[level] || level;
}

function normalizeMediaTypeValue(value) {
    if (!value || typeof value !== "string") return null;

    const normalized = value.toLowerCase().trim();
    const aliases = {
        photo: "image",
        image: "image",
        imagem: "image",
        foto: "image",
        picture: "image",
        figurinhas: "sticker",
        figurinha: "sticker",
        sticker: "sticker",
        stickers: "sticker",
        video: "video",
        videoo: "video",
        vídeo: "video",
        audio: "audio",
        audioo: "audio",
        áudio: "audio",
        musica: "audio",
        música: "audio",
        voice: "voice",
        document: "document",
        documento: "document",
        doc: "document",
        file: "document",
        location: "location",
        localizacao: "location",
        localização: "location",
        geo: "location",
        map: "location",
        contact: "contact",
        contato: "contact",
        gif: "gif",
        animated: "gif"
    };

    return aliases[normalized] || normalized.replace(/[^a-z]/g, "").replace(/s$/, "") || null;
}

function normalizeMediaTypes(input) {
    if (!input) return [];

    const items = Array.isArray(input)
        ? input.flatMap(item => String(item).split(/[\n,]+/))
        : String(input).split(/[\n,]+/);

    const normalized = [];
    for (const item of items) {
        const value = normalizeMediaTypeValue(item);
        if (value && !normalized.includes(value)) {
            normalized.push(value);
        }
    }

    return normalized;
}

function readAntimedia(settingsObj) {
    const am = settingsObj?.antimedia || {};
    return {
        enabled: am.enabled === true,
        action: am.action || "delete",
        message: am.message || null,
        ignoreParent: am.ignoreParent === true,
        mediaTypes: Array.isArray(am.mediaTypes) ? normalizeMediaTypes(am.mediaTypes) : normalizeMediaTypes(am.types || am.media || []),
        userWhitelist: Array.isArray(am.userWhitelist) ? am.userWhitelist : [],
        userBlacklist: Array.isArray(am.userBlacklist) ? am.userBlacklist : [],
        roleWhitelist: Array.isArray(am.roleWhitelist) ? am.roleWhitelist : [],
        roleBlacklist: Array.isArray(am.roleBlacklist) ? am.roleBlacklist : []
    };
}

function resolveAntimediaConfig(message) {
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

    const winner = active[active.length - 1];
    const mergedUserWhitelist = [
        ...new Set(active.flatMap(({ config }) => config.userWhitelist || []))
    ];
    const mergedUserBlacklist = [
        ...new Set(active.flatMap(({ config }) => config.userBlacklist || []))
    ];
    const mergedRoleWhitelist = [
        ...new Set(active.flatMap(({ config }) => config.roleWhitelist || []))
    ];
    const mergedRoleBlacklist = [
        ...new Set(active.flatMap(({ config }) => config.roleBlacklist || []))
    ];

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

function buildChain(message) {
    const { platform, chatId, threadId, raw } = message;
    const chain = [];

    if (platform === "discord") {
        const guildId = raw?.guild ? String(raw.guild.id) : null;
        if (!guildId) return chain;

        const serverData = loadSettings("discord", guildId, "server");
        chain.push({ level: "server", config: readAntimedia(serverData.settings) });

        const channel = raw?.channel;
        const parentId = channel?.parentId || null;
        const isInCategory = parentId && !channel?.isThread?.();
        if (isInCategory && Array.isArray(serverData.categoria)) {
            const cat = serverData.categoria.find(c => c.id === parentId);
            if (cat) {
                chain.push({ level: "categoria", config: readAntimedia(cat.settings) });
            }
        }

        const chanId = channel?.isThread?.()
            ? String(channel.parentId)
            : String(channel?.id || chatId);
        const chatSettings = findChatSettings(serverData, chanId);

        if (channel?.isThread?.()) {
            const threadSettings = chatSettings?.topico?.find(t => t.id === String(channel.id));
            chain.push({ level: "chat", config: readAntimedia(chatSettings?.settings) });
            if (threadSettings) {
                chain.push({ level: "chat", config: readAntimedia(threadSettings.settings) });
            }
        } else {
            chain.push({ level: "chat", config: readAntimedia(chatSettings?.settings) });
        }
    } else if (platform === "whatsapp") {
        const isGroup = chatId?.endsWith("@g.us");
        if (!isGroup) return chain;

        const commFile = findWhatsAppCommunityFile(chatId);
        if (commFile) {
            const commData = loadSettings("whatsapp", commFile.communityId, "community");
            chain.push({ level: "server", config: readAntimedia(commData.settings) });
            const groupInComm = (commData.chat || []).find(c => c.id === chatId);
            chain.push({ level: "chat", config: readAntimedia(groupInComm?.settings) });
        } else {
            const groupData = loadSettings("whatsapp", chatId, "group");
            chain.push({ level: "server", config: readAntimedia(groupData.settings) });
            chain.push({ level: "chat", config: readAntimedia(groupData.settings) });
        }
    } else if (platform === "telegram") {
        const groupData = loadSettings("telegram", chatId, "group");
        chain.push({ level: "server", config: readAntimedia(groupData.settings) });
        if (threadId && Array.isArray(groupData.topico)) {
            const topic = groupData.topico.find(t => t.id === String(threadId));
            if (topic) {
                chain.push({ level: "chat", config: readAntimedia(topic.settings) });
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

function getSetAntimedia(message, level, newConfig = null) {
    const { platform, chatId, threadId, raw } = message;

    if (platform === "discord") {
        const guildId = raw?.guild ? String(raw.guild.id) : null;
        if (!guildId) return null;
        const serverData = loadSettings("discord", guildId, "server");

        if (level === "server") {
            if (newConfig) {
                serverData.settings = serverData.settings || {};
                serverData.settings.antimedia = { ...readAntimedia(serverData.settings), ...newConfig };
                saveSettings("discord", guildId, "server", serverData, message);
            }
            return readAntimedia(serverData.settings);
        }

        if (level === "categoria") {
            const parentId = raw?.channel?.parentId;
            if (!parentId) return null;
            const cat = (serverData.categoria || []).find(c => c.id === parentId);
            if (!cat) return null;
            if (newConfig) {
                cat.settings = cat.settings || {};
                cat.settings.antimedia = { ...readAntimedia(cat.settings), ...newConfig };
                saveSettings("discord", guildId, "server", serverData, message);
            }
            return readAntimedia(cat.settings);
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
                    topicObj.settings.antimedia = { ...readAntimedia(topicObj.settings), ...newConfig };
                    saveSettings("discord", guildId, "server", serverData, message);
                }
                return readAntimedia(topicObj.settings);
            }

            if (newConfig) {
                chatObj.settings = chatObj.settings || {};
                chatObj.settings.antimedia = { ...readAntimedia(chatObj.settings), ...newConfig };
                saveSettings("discord", guildId, "server", serverData);
            }
            return readAntimedia(chatObj.settings);
        }
    }

    if (platform === "whatsapp") {
        const commFile = findWhatsAppCommunityFile(chatId);
        if (commFile) {
            const commData = loadSettings("whatsapp", commFile.communityId, "community");
            if (level === "server") {
                if (newConfig) {
                    commData.settings = commData.settings || {};
                    commData.settings.antimedia = { ...readAntimedia(commData.settings), ...newConfig };
                    saveSettings("whatsapp", commFile.communityId, "community", commData, message);
                }
                return readAntimedia(commData.settings);
            }
            if (level === "chat") {
                const groupEntry = (commData.chat || []).find(c => c.id === chatId);
                if (!groupEntry) return null;
                if (newConfig) {
                    groupEntry.settings = groupEntry.settings || {};
                    groupEntry.settings.antimedia = { ...readAntimedia(groupEntry.settings), ...newConfig };
                    saveSettings("whatsapp", commFile.communityId, "community", commData, message);
                }
                return readAntimedia(groupEntry.settings);
            }
        } else {
            const groupData = loadSettings("whatsapp", chatId, "group");
            if (newConfig) {
                groupData.settings = groupData.settings || {};
                groupData.settings.antimedia = { ...readAntimedia(groupData.settings), ...newConfig };
                saveSettings("whatsapp", chatId, "group", groupData, message);
            }
            return readAntimedia(groupData.settings);
        }
    }

    if (platform === "telegram") {
        const groupData = loadSettings("telegram", chatId, "group");
        if (level === "server") {
            if (newConfig) {
                groupData.settings = groupData.settings || {};
                groupData.settings.antimedia = { ...readAntimedia(groupData.settings), ...newConfig };
                saveSettings("telegram", chatId, "group", groupData, message);
            }
            return readAntimedia(groupData.settings);
        }
        if (level === "chat") {
            if (!threadId) return null;
            const topic = (groupData.topico || []).find(t => t.id === String(threadId));
            if (!topic) return null;
            if (newConfig) {
                topic.settings = topic.settings || {};
                topic.settings.antimedia = { ...readAntimedia(topic.settings), ...newConfig };
                saveSettings("telegram", chatId, "group", groupData, message);
            }
            return readAntimedia(topic.settings);
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

function detectMediaType(message) {
    if (!message) return null;

    if (message.media?.type) {
        return normalizeMediaTypeValue(message.media.type) || null;
    }

    if (message.media?.mimeType) {
        const mime = message.media.mimeType.toLowerCase();
        const fileName = String(message.media.fileName || "").toLowerCase();
        if (mime.includes("image") || /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName)) {
            return fileName.includes("gif") || mime.includes("gif") ? "gif" : "image";
        }
        if (mime.includes("video") || /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName)) return "video";
        if (mime.includes("audio") || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName)) return "audio";
        if (/\.(pdf|doc|txt|zip)$/i.test(fileName) || mime.includes("application")) return "document";
    }

    const raw = message.raw || {};
    const content = raw.message || raw;

    if (content?.imageMessage) return "image";
    if (content?.videoMessage) return "video";
    if (content?.audioMessage) return "audio";
    if (content?.voiceMessage) return "voice";
    if (content?.documentMessage) return "document";
    if (content?.stickerMessage) return "sticker";
    if (content?.locationMessage || content?.liveLocationMessage) return "location";
    if (content?.contactMessage) return "contact";

    if (content?.photo) return "image";
    if (content?.video) return "video";
    if (content?.audio) return "audio";
    if (content?.voice) return "voice";
    if (content?.document) return "document";
    if (content?.sticker) return "sticker";
    if (content?.location || content?.venue) return "location";

    if (raw?.attachments?.first) {
        const attachment = raw.attachments.first();
        if (attachment?.contentType) {
            const type = attachment.contentType.toLowerCase();
            if (type.includes("image")) return "image";
            if (type.includes("video")) return "video";
            if (type.includes("audio")) return "audio";
            if (type.includes("application") || type.includes("octet-stream")) return "document";
        }
    }

    if (raw?.photo) return "image";
    if (raw?.video) return "video";
    if (raw?.audio || raw?.voice) return "audio";
    if (raw?.document) return "document";
    if (raw?.sticker) return "sticker";
    if (raw?.location || raw?.venue) return "location";

    return null;
}

module.exports = {
    ALL_MEDIA_TYPES,
    LEVEL_LABELS,
    getLevelLabel,
    getAvailableLevels,
    getSetAntimedia,
    resolveAntimediaConfig,
    readAntimedia,
    normalizeMediaTypes,
    detectMediaType
};
