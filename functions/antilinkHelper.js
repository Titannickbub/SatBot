const { loadSettings, saveSettings } = require("./groupSettings");

// ─────────────────────────────────────────────────────────────
//  DETECÇÃO DE LINKS
// ─────────────────────────────────────────────────────────────

const LINK_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i;

/**
 * Retorna true se o texto contiver algum link.
 * @param {string} text
 * @returns {boolean}
 */
function hasLink(text) {
    if (!text || typeof text !== "string") return false;
    return LINK_REGEX.test(text);
}

// ─────────────────────────────────────────────────────────────
//  TERMINOLOGIA NATIVA POR PLATAFORMA
// ─────────────────────────────────────────────────────────────

const LEVEL_LABELS = {
    discord: {
        server:   "Servidor",
        categoria: "Categoria",
        chat:     "Canal / Thread"
    },
    whatsapp: {
        server: "Comunidade / Grupo Geral",
        chat:   "Grupo"
    },
    telegram: {
        server: "Grupo / Canal",
        chat:   "Tópico / Grupo"
    }
};

/**
 * Retorna o rótulo nativo de um nível para a plataforma.
 * @param {string} platform
 * @param {string} level  'server' | 'categoria' | 'chat'
 * @returns {string}
 */
function getLevelLabel(platform, level) {
    return (LEVEL_LABELS[platform] || {})[level] || level;
}

// ─────────────────────────────────────────────────────────────
//  LEITURA DE CONFIGURAÇÃO ANTILINK NUM NÍvel DO JSON
// ─────────────────────────────────────────────────────────────

/**
 * Lê o objeto `antilink` de um nó de settings, nunca retorna null.
 * @param {object} settingsObj
 * @returns {{ enabled: boolean, action: string, message: string, ignoreParent: boolean, whitelist: string[], userWhitelist: string[] }}
 */
function readAntilink(settingsObj) {
    const al = settingsObj?.antilink || {};
    return {
        enabled:      al.enabled      === true,
        action:       al.action       || "delete",
        message:      al.message      || null,
        ignoreParent: al.ignoreParent === true,
        ignoreSameGroup: al.ignoreSameGroup === true,
        ignoreMedia:  al.ignoreMedia  === true,
        whitelist:    Array.isArray(al.whitelist)     ? al.whitelist     : [],
        userWhitelist: Array.isArray(al.userWhitelist) ? al.userWhitelist : []
    };
}

// ─────────────────────────────────────────────────────────────
//  RESOLUÇÃO DA HIERARQUIA — retorna a configuração ativa
// ─────────────────────────────────────────────────────────────

/**
 * Dado o contexto de uma mensagem, resolve a cadeia de configs de antilink
 * do nível mais alto até o mais baixo, respeitando ignoreParent e retornando
 * apenas a config de nível mais alto ativa (sem duplicar punições).
 *
 * @param {object} message  Objeto de mensagem do bot
 * @returns {{ level: string, config: object } | null}  Nível ativo + config, ou null se desativado.
 */
function resolveAntilinkConfig(message) {
    const chain = buildChain(message);

    // Percorre do mais alto ao mais baixo
    // Cada item: { level, config }
    const active = [];

    for (const { level, config } of chain) {
        // Se este nível pedir para ignorar os de cima, descarta o acumulado
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

/**
 * Constrói a cadeia de (nível → config) do mais alto ao mais baixo
 * para o contexto da mensagem recebida.
 */
function buildChain(message) {
    const { platform, chatId, threadId, raw } = message;
    const chain = [];

    if (platform === "discord") {
        // Identifica guild, categoria e canal/thread
        const msg = raw;
        const guild = msg?.guild;
        const guildId = guild ? String(guild.id) : null;

        if (guildId) {
            const serverData = loadSettings("discord", guildId, "server");

            // Nível server
            chain.push({ level: "server", config: readAntilink(serverData.settings) });

            // Nível categoria (só se o canal estiver em uma)
            const channel = msg?.channel;
            const parentId = channel?.parentId || null;
            const isInCategory = parentId && !channel?.isThread?.();

            if (isInCategory && Array.isArray(serverData.categoria)) {
                const cat = serverData.categoria.find(c => c.id === parentId);
                if (cat) {
                    chain.push({ level: "categoria", config: readAntilink(cat.settings) });
                }
            }

            // Nível chat (canal ou thread)
            const chanId = channel?.isThread?.()
                ? String(channel.parentId)   // thread: canal pai
                : String(channel?.id || chatId);

            // Procura nas categorias e soltos
            let chatSettings = findChatSettings(serverData, chanId);

            if (channel?.isThread?.()) {
                // Thread: vai um nível mais fundo
                const threadSettings = chatSettings?.topico?.find(t => t.id === String(channel.id));
                chain.push({ level: "chat", config: readAntilink(chatSettings?.settings) });
                if (threadSettings) {
                    chain.push({ level: "chat", config: readAntilink(threadSettings.settings) });
                }
            } else {
                chain.push({ level: "chat", config: readAntilink(chatSettings?.settings) });
            }
        }

    } else if (platform === "whatsapp") {
        const isGroup = chatId?.endsWith("@g.us");
        if (!isGroup) return chain;

        // Tenta descobrir se pertence a uma comunidade
        const commFile = findWhatsAppCommunityFile(chatId);

        if (commFile) {
            const commData = loadSettings("whatsapp", commFile.communityId, "community");
            chain.push({ level: "server", config: readAntilink(commData.settings) });

            const groupInComm = (commData.chat || []).find(c => c.id === chatId);
            chain.push({ level: "chat", config: readAntilink(groupInComm?.settings) });
        } else {
            // Grupo standalone: server e chat apontam pro mesmo arquivo
            const groupData = loadSettings("whatsapp", chatId, "group");
            chain.push({ level: "server", config: readAntilink(groupData.settings) });
            // chat == server para standalone — usa o mesmo settings mas como nível mais baixo
            chain.push({ level: "chat", config: readAntilink(groupData.settings) });
        }

    } else if (platform === "telegram") {
        const groupData = loadSettings("telegram", chatId, "group");

        // Nível server = o grupo/canal global
        chain.push({ level: "server", config: readAntilink(groupData.settings) });

        // Nível chat = tópico (se existir threadId)
        if (threadId && Array.isArray(groupData.topico)) {
            const topic = groupData.topico.find(t => t.id === String(threadId));
            if (topic) {
                chain.push({ level: "chat", config: readAntilink(topic.settings) });
            }
        }
    }

    return chain;
}

// ─────────────────────────────────────────────────────────────
//  HELPERS DE BUSCA NO JSON
// ─────────────────────────────────────────────────────────────

function findChatSettings(serverData, chanId) {
    // Procura em canais soltos
    if (Array.isArray(serverData.chat)) {
        const found = serverData.chat.find(c => c.id === chanId);
        if (found) return found;
    }
    // Procura dentro das categorias
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

const fs   = require("fs");
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

// ─────────────────────────────────────────────────────────────
//  LEITURA/ESCRITA DE CONFIGS POR NÍVEL
// ─────────────────────────────────────────────────────────────

/**
 * Lê e escreve a config antilink de um nível específico.
 * @param {object} message
 * @param {string} level   'server' | 'categoria' | 'chat'
 * @param {object|null} newConfig  Se fornecido, salva; se null, apenas lê.
 * @returns {object} config atual após operação
 */
function getSetAntilink(message, level, newConfig = null) {
    const { platform, chatId, threadId, raw } = message;

    if (platform === "discord") {
        const guildId = raw?.guild ? String(raw.guild.id) : null;
        if (!guildId) return null;

        const serverData = loadSettings("discord", guildId, "server");

        if (level === "server") {
            if (newConfig) {
                serverData.settings = serverData.settings || {};
                serverData.settings.antilink = { ...readAntilink(serverData.settings), ...newConfig };
                saveSettings("discord", guildId, "server", serverData, message);
            }
            return readAntilink(serverData.settings);
        }

        if (level === "categoria") {
            const parentId = raw?.channel?.parentId;
            if (!parentId) return null;
            const cat = (serverData.categoria || []).find(c => c.id === parentId);
            if (!cat) return null;
            if (newConfig) {
                cat.settings = cat.settings || {};
                cat.settings.antilink = { ...readAntilink(cat.settings), ...newConfig };
                saveSettings("discord", guildId, "server", serverData, message);
            }
            return readAntilink(cat.settings);
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
                    topicObj.settings.antilink = { ...readAntilink(topicObj.settings), ...newConfig };
                    saveSettings("discord", guildId, "server", serverData, message);
                }
                return readAntilink(topicObj.settings);
            } else {
                if (newConfig) {
                    chatObj.settings = chatObj.settings || {};
                    chatObj.settings.antilink = { ...readAntilink(chatObj.settings), ...newConfig };
                    saveSettings("discord", guildId, "server", serverData);
                }
                return readAntilink(chatObj.settings);
            }
        }
    }

    if (platform === "whatsapp") {
        const commFile = findWhatsAppCommunityFile(chatId);

        if (commFile) {
            const commData = loadSettings("whatsapp", commFile.communityId, "community");

            if (level === "server") {
                if (newConfig) {
                    commData.settings = commData.settings || {};
                    commData.settings.antilink = { ...readAntilink(commData.settings), ...newConfig };
                    saveSettings("whatsapp", commFile.communityId, "community", commData, message);
                }
                return readAntilink(commData.settings);
            }

            if (level === "chat") {
                const groupEntry = (commData.chat || []).find(c => c.id === chatId);
                if (!groupEntry) return null;
                if (newConfig) {
                    groupEntry.settings = groupEntry.settings || {};
                    groupEntry.settings.antilink = { ...readAntilink(groupEntry.settings), ...newConfig };
                    saveSettings("whatsapp", commFile.communityId, "community", commData, message);
                }
                return readAntilink(groupEntry.settings);
            }
        } else {
            const groupData = loadSettings("whatsapp", chatId, "group");
            if (newConfig) {
                groupData.settings = groupData.settings || {};
                groupData.settings.antilink = { ...readAntilink(groupData.settings), ...newConfig };
                saveSettings("whatsapp", chatId, "group", groupData, message);
            }
            return readAntilink(groupData.settings);
        }
    }

    if (platform === "telegram") {
        const groupData = loadSettings("telegram", chatId, "group");

        if (level === "server") {
            if (newConfig) {
                groupData.settings = groupData.settings || {};
                groupData.settings.antilink = { ...readAntilink(groupData.settings), ...newConfig };
                saveSettings("telegram", chatId, "group", groupData, message);
            }
            return readAntilink(groupData.settings);
        }

        if (level === "chat") {
            if (!threadId) return null;
            const topic = (groupData.topico || []).find(t => t.id === String(threadId));
            if (!topic) return null;
            if (newConfig) {
                topic.settings = topic.settings || {};
                topic.settings.antilink = { ...readAntilink(topic.settings), ...newConfig };
                saveSettings("telegram", chatId, "group", groupData, message);
            }
            return readAntilink(topic.settings);
        }
    }

    return null;
}

// ─────────────────────────────────────────────────────────────
//  NÍVEIS DISPONÍVEIS PARA O CONTEXTO ATUAL
// ─────────────────────────────────────────────────────────────

/**
 * Retorna a lista de níveis disponíveis no contexto atual da mensagem.
 * @param {object} message
 * @returns {string[]}
 */
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

module.exports = {
    hasLink,
    getLevelLabel,
    resolveAntilinkConfig,
    getSetAntilink,
    getAvailableLevels,
    readAntilink
};
