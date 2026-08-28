const { loadSettings, saveSettings } = require("./groupSettings");
const core = require("../core");

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

function getAvailableLevels(platform) {
    if (platform === "discord") return ["server", "categoria", "chat"];
    if (platform === "whatsapp") return ["server", "chat"];
    if (platform === "telegram") return ["server", "chat"];
    return ["chat"];
}

function readBlockcmd(settingsObj) {
    const bc = settingsObj?.blockcmd || {};
    return {
        enabled: bc.enabled === true,
        action: bc.action || "reply",
        message: bc.message || null,
        ignoreParent: bc.ignoreParent === true,
        blockedCommands: Array.isArray(bc.blockedCommands) ? bc.blockedCommands : []
    };
}

function buildChain(message) {
    const platform = message.platform;
    const chain = [];

    if (platform === "discord" && message.raw?.guild) {
        const guildId = message.raw.guild.id;
        const channel = message.raw.channel;

        const serverData = loadSettings("discord", guildId, "server");
        chain.push({ level: "server", config: readBlockcmd(serverData.settings) });

        if (channel.parent) {
            const catData = loadSettings("discord", channel.parent.id, "categoria");
            chain.push({ level: "categoria", config: readBlockcmd(catData.settings) });
        }

        const channelData = loadSettings("discord", channel.id, "chat");
        chain.push({ level: "chat", config: readBlockcmd(channelData.settings) });

    } else if (platform === "telegram") {
        const chatId = message.chatId;
        const isForum = !!message.raw?.chat?.is_forum;
        const threadId = message.threadId;

        const groupData = loadSettings("telegram", chatId, "chat");

        if (isForum) {
            chain.push({ level: "server", config: readBlockcmd(groupData.settings) });
            if (threadId) {
                const topic = groupData.topics?.[threadId];
                if (topic) {
                    chain.push({ level: "chat", config: readBlockcmd(topic.settings) });
                }
            }
        } else {
            chain.push({ level: "chat", config: readBlockcmd(groupData.settings) });
        }

    } else if (platform === "whatsapp") {
        const chatId = message.chatId;
        const groupData = loadSettings("whatsapp", chatId, "group");
        chain.push({ level: "chat", config: readBlockcmd(groupData.settings) });
    }

    return chain;
}

function resolveBlockcmdConfig(message) {
    if (message.isPrivate) return null;

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

    if (!active.length) return null;

    // Combina todas as regras dos níveis ativos
    const allBlocked = new Set();
    let effectiveAction = "reply";
    let effectiveMessage = null;
    let primaryLevel = active[active.length - 1].level;

    for (const { level, config } of active) {
        for (const cmd of config.blockedCommands) {
            allBlocked.add(cmd.toLowerCase());
        }
        if (config.action) effectiveAction = config.action;
        if (config.message) effectiveMessage = config.message;
    }

    return {
        level: primaryLevel,
        config: {
            enabled: true,
            action: effectiveAction,
            message: effectiveMessage,
            blockedCommands: Array.from(allBlocked)
        }
    };
}

function isCommandBlocked(message, resolvedConfig) {
    if (!resolvedConfig || !resolvedConfig.config || !resolvedConfig.config.enabled) {
        return false;
    }

    const blockedList = resolvedConfig.config.blockedCommands || [];
    if (!blockedList.length) return false;

    const invoked = (message.command || "").toLowerCase().trim();
    if (!invoked) return false;

    // 1. Verifica se o comando direto foi bloqueado
    if (blockedList.includes(invoked)) return true;

    // 2. Busca o objeto do comando no core para verificar nome original, aliases e categoria
    const commands = core.getCommands();
    const cmdObj = commands[invoked];

    if (cmdObj) {
        const mainName = (cmdObj.name || "").toLowerCase();
        const category = (cmdObj.category || "").toLowerCase();

        if (mainName && blockedList.includes(mainName)) return true;
        if (category && blockedList.includes(category)) return true;

        if (Array.isArray(cmdObj.aliases)) {
            for (const alias of cmdObj.aliases) {
                if (blockedList.includes(alias.toLowerCase())) return true;
            }
        }
    }

    return false;
}

function getSetBlockcmd(message, level, newConfig = null) {
    const platform = message.platform;

    if (platform === "discord" && message.raw?.guild) {
        const guildId = message.raw.guild.id;
        const channel = message.raw.channel;

        if (level === "server") {
            const serverData = loadSettings("discord", guildId, "server");
            if (newConfig) {
                serverData.settings.blockcmd = { ...readBlockcmd(serverData.settings), ...newConfig };
                saveSettings("discord", guildId, "server", serverData);
            }
            return readBlockcmd(serverData.settings);
        }

        if (level === "categoria" && channel.parent) {
            const catData = loadSettings("discord", channel.parent.id, "categoria");
            if (newConfig) {
                catData.settings.blockcmd = { ...readBlockcmd(catData.settings), ...newConfig };
                saveSettings("discord", channel.parent.id, "categoria", catData);
            }
            return readBlockcmd(catData.settings);
        }

        if (level === "chat") {
            const channelData = loadSettings("discord", channel.id, "chat");
            if (newConfig) {
                channelData.settings.blockcmd = { ...readBlockcmd(channelData.settings), ...newConfig };
                saveSettings("discord", channel.id, "chat", channelData);
            }
            return readBlockcmd(channelData.settings);
        }

    } else if (platform === "telegram") {
        const chatId = message.chatId;
        const isForum = !!message.raw?.chat?.is_forum;
        const threadId = message.threadId;

        const groupData = loadSettings("telegram", chatId, "chat");

        if (level === "server" || !isForum) {
            if (newConfig) {
                groupData.settings.blockcmd = { ...readBlockcmd(groupData.settings), ...newConfig };
                saveSettings("telegram", chatId, "chat", groupData);
            }
            return readBlockcmd(groupData.settings);
        }

        if (level === "chat" && isForum && threadId) {
            groupData.topics = groupData.topics || {};
            const topic = groupData.topics[threadId] || { settings: {} };
            if (newConfig) {
                topic.settings.blockcmd = { ...readBlockcmd(topic.settings), ...newConfig };
                groupData.topics[threadId] = topic;
                saveSettings("telegram", chatId, "chat", groupData);
            }
            return readBlockcmd(topic.settings);
        }

    } else if (platform === "whatsapp") {
        const chatId = message.chatId;
        const groupData = loadSettings("whatsapp", chatId, "group");
        if (newConfig) {
            groupData.settings.blockcmd = { ...readBlockcmd(groupData.settings), ...newConfig };
            saveSettings("whatsapp", chatId, "group", groupData);
        }
        return readBlockcmd(groupData.settings);
    }

    return readBlockcmd({});
}

module.exports = {
    getLevelLabel,
    getAvailableLevels,
    readBlockcmd,
    resolveBlockcmdConfig,
    isCommandBlocked,
    getSetBlockcmd
};
