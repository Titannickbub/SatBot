const fs = require("fs");
const path = require("path");

const groupsDir = path.join(__dirname, "..", "settings", "groups");

/**
 * Garante que a pasta settings/groups exista.
 */
function ensureDirectoryExistence() {
    if (!fs.existsSync(groupsDir)) {
        fs.mkdirSync(groupsDir, { recursive: true });
    }
}

/**
 * Sanitiza o ID para evitar caracteres inválidos no sistema de arquivos do Windows.
 */
function sanitizeFilename(id) {
    if (typeof id !== "string") return id;
    // Substitui caracteres inválidos (\ / : * ? " < > |) por sublinhado (_)
    return id.replace(/[\\/:*?"<>|]/g, "_");
}

function pickFirstDefined(...values) {
    for (const value of values) {
        if (value === undefined || value === null) continue;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
            continue;
        }
        if (value !== "") return value;
    }
    return null;
}

function buildMetadataContext(platform, type, context = {}) {
    const raw = context.raw || {};
    const guild = raw.guild || context.guild || {};
    const channel = raw.channel || context.channel || {};
    const parent = channel.parent || context.parent || {};
    const chat = raw.chat || context.chat || {};
    const metadata = raw.metadata || context.metadata || {};

    if (platform === "whatsapp" && type === "community") {
        const explicitName = pickFirstDefined(
            context.serverName,
            context.communityName,
            context.groupName,
            context.chatName,
            context.name
        );

        return {
            serverName: explicitName,
            groupName: explicitName,
            chatName: explicitName,
            categoryName: null
        };
    }

    const serverName = pickFirstDefined(
        context.serverName,
        guild.name,
        context.server?.name,
        metadata.serverName,
        metadata.server
    );

    const groupName = pickFirstDefined(
        context.groupName,
        context.chatName,
        chat.title,
        metadata.subject,
        chat.name,
        channel.name,
        guild.name,
        context.name
    );

    const chatName = pickFirstDefined(
        context.chatName,
        groupName,
        chat.title,
        chat.name,
        channel.name,
        metadata.subject,
        context.name
    );

    const categoryName = pickFirstDefined(
        context.categoryName,
        parent.name,
        metadata.categoryName,
        context.category?.name
    );

    return {
        serverName,
        groupName,
        chatName,
        categoryName
    };
}

function ensureSettingsMetadata(data, platform, type, context = {}) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return data;
    }

    const metadata = buildMetadataContext(platform, type, context);

    if (metadata.serverName) {
        data.serverName = metadata.serverName;
    } else {
        data.serverName = data.serverName || null;
    }

    if (metadata.groupName) {
        data.groupName = metadata.groupName;
    } else {
        data.groupName = data.groupName || null;
    }

    if (metadata.chatName) {
        data.chatName = metadata.chatName;
    } else {
        data.chatName = data.chatName || data.groupName || null;
    }

    if (metadata.categoryName) {
        data.categoryName = metadata.categoryName;
    } else {
        data.categoryName = data.categoryName || null;
    }

    return data;
}

/**
 * Retorna o nome do arquivo JSON correspondente à plataforma e ID.
 */
function getFilename(platform, id, type) {
    const cleanId = sanitizeFilename(id);
    if (platform === "discord") {
        return type === "server" ? `DiscS${cleanId}.json` : `DiscG${cleanId}.json`;
    } else if (platform === "whatsapp") {
        return type === "community" ? `waC${cleanId}.json` : `waG${cleanId}.json`;
    } else if (platform === "telegram") {
        return type === "channel" ? `telC${cleanId}.json` : `telG${cleanId}.json`;
    }
    return `${platform}_${cleanId}.json`;
}

/**
 * Gera a estrutura padrão inicial para cada plataforma/tipo de chat.
 */
function getDefaultSettings(platform, type, id) {
    if (platform === "discord") {
        if (type === "server") {
            return {
                server: id,
                categoria: [],
                chat: [],
                settings: {},
                serverName: null,
                groupName: null,
                chatName: null,
                categoryName: null
            };
        } else {
            return {
                server: null,
                categoria: null,
                chat: [
                    {
                        id: id,
                        topico: [],
                        settings: {}
                    }
                ],
                settings: {},
                serverName: null,
                groupName: null,
                chatName: null,
                categoryName: null
            };
        }
    } else if (platform === "whatsapp") {
        if (type === "community") {
            return {
                server: id,
                categoria: null,
                chat: [],
                topico: null,
                settings: {},
                serverName: "Comunidade",
                groupName: "Comunidade",
                chatName: "Comunidade",
                categoryName: null
            };
        } else {
            return {
                server: null,
                categoria: null,
                chat: id,
                topico: null,
                settings: {},
                serverName: null,
                groupName: null,
                chatName: null,
                categoryName: null
            };
        }
    } else if (platform === "telegram") {
        return {
            server: null,
            categoria: null,
            chat: id,
            topico: null,
            settings: {},
            serverName: null,
            groupName: null,
            chatName: null,
            categoryName: null
        };
    }
    return {
        server: null,
        categoria: null,
        chat: id,
        topico: null,
        settings: {},
        serverName: null,
        groupName: null,
        chatName: null,
        categoryName: null
    };
}

/**
 * Carrega as configurações de um grupo/servidor.
 */
function loadSettings(platform, id, type) {
    ensureDirectoryExistence();
    const filename = getFilename(platform, id, type);
    const filePath = path.join(groupsDir, filename);

    if (fs.existsSync(filePath)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
            return ensureSettingsMetadata(parsed, platform, type, {});
        } catch (err) {
            console.error(`[groupSettings] Erro ao ler arquivo ${filename}:`, err);
        }
    }

    return getDefaultSettings(platform, type, id);
}

/**
 * Salva as configurações de um grupo/servidor.
 */
function saveSettings(platform, id, type, data, context = {}) {
    ensureDirectoryExistence();
    const filename = getFilename(platform, id, type);
    const filePath = path.join(groupsDir, filename);

    try {
        const normalizedData = ensureSettingsMetadata(data, platform, type, context);
        fs.writeFileSync(filePath, JSON.stringify(normalizedData, null, 4), "utf8");
        return true;
    } catch (err) {
        console.error(`[groupSettings] Erro ao salvar arquivo ${filename}:`, err);
        return false;
    }
}

/**
 * Deleta o arquivo de configurações de um grupo/servidor.
 */
function deleteSettingsFile(platform, id, type) {
    const filename = getFilename(platform, id, type);
    const filePath = path.join(groupsDir, filename);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`[groupSettings] Arquivo de configurações deletado: ${filename}`);
            return true;
        } catch (err) {
            console.error(`[groupSettings] Erro ao deletar arquivo ${filename}:`, err);
        }
    }
    return false;
}

/**
 * Sincroniza a hierarquia do Discord preservando configurações de canais e tópicos.
 * @param {string} guildId ID do Servidor (Guild)
 * @param {Array<{id: string, name: string, type: string, parentId: string}>} activeChannels Coleção de canais ativos
 */
function syncDiscordHierarchy(guildId, activeChannels, guildName = null) {
    if (!guildId) return;

    const oldData = loadSettings("discord", guildId, "server");

    // Mapeia configurações existentes para preservar na nova estrutura
    const categorySettings = {};
    const chatSettings = {};

    if (Array.isArray(oldData.categoria)) {
        for (const cat of oldData.categoria) {
            categorySettings[cat.id] = cat.settings || {};
            if (Array.isArray(cat.chat)) {
                for (const ch of cat.chat) {
                    chatSettings[ch.id] = {
                        settings: ch.settings || {},
                        topics: {}
                    };
                    if (Array.isArray(ch.topico)) {
                        for (const top of ch.topico) {
                            chatSettings[ch.id].topics[top.id] = top.settings || {};
                        }
                    }
                }
            }
        }
    }

    if (Array.isArray(oldData.chat)) {
        for (const ch of oldData.chat) {
            chatSettings[ch.id] = {
                settings: ch.settings || {},
                topics: {}
            };
            if (Array.isArray(ch.topico)) {
                for (const top of ch.topico) {
                    chatSettings[ch.id].topics[top.id] = top.settings || {};
                }
            }
        }
    }

    const serverSettings = oldData.settings || {};

    // Separa canais por categoria, chats normais e threads
    const activeCategories = [];
    const activeChats = [];
    const activeThreads = [];

    for (const chan of activeChannels) {
        if (chan.type === "category") {
            activeCategories.push(chan);
        } else if (chan.type === "thread" || chan.type === "publicThread" || chan.type === "privateThread" || chan.type === "announcementThread") {
            activeThreads.push(chan);
        } else {
            activeChats.push(chan);
        }
    }

    const categoriesMap = {};
    const newCategories = [];

    // Reconstrói categorias
    for (const cat of activeCategories) {
        const catObj = {
            id: cat.id,
            name: cat.name,
            chat: [],
            settings: categorySettings[cat.id] || {}
        };
        categoriesMap[cat.id] = catObj;
        newCategories.push(catObj);
    }

    const chatsMap = {};
    const newLooseChats = [];

    // Reconstrói chats/canais normais
    for (const ch of activeChats) {
        const existingInfo = chatSettings[ch.id] || { settings: {}, topics: {} };
        const chatObj = {
            id: ch.id,
            name: ch.name,
            topico: [],
            settings: existingInfo.settings
        };
        chatsMap[ch.id] = chatObj;

        if (ch.parentId && categoriesMap[ch.parentId]) {
            categoriesMap[ch.parentId].chat.push(chatObj);
        } else {
            newLooseChats.push(chatObj);
        }
    }

    // Reconstrói tópicos/threads
    for (const th of activeThreads) {
        const parentChat = chatsMap[th.parentId];
        if (parentChat) {
            const existingChatInfo = chatSettings[th.parentId];
            const threadSettings = (existingChatInfo && existingChatInfo.topics[th.id]) || {};
            parentChat.topico.push({
                id: th.id,
                name: th.name,
                settings: threadSettings
            });
        }
    }

    const newHierarchy = ensureSettingsMetadata({
        ...oldData,
        server: guildId,
        categoria: newCategories,
        chat: newLooseChats,
        settings: serverSettings
    }, "discord", "server", {
        raw: {
            guild: {
                id: guildId,
                name: guildName || oldData.serverName || null
            }
        },
        serverName: guildName || oldData.serverName || null
    });

    if (newCategories.length === 0 && newLooseChats.length === 0) {
        deleteSettingsFile("discord", guildId, "server");
    } else {
        saveSettings("discord", guildId, "server", newHierarchy);
    }
}

/**
 * Sincroniza a hierarquia no Telegram (adiciona novos tópicos caso existam).
 */
function syncTelegramHierarchy(chatId, topicId = null, topicName = null, isForum = false, chatTitle = null) {
    if (!chatId) return;

    const data = loadSettings("telegram", chatId, "group");

    if (isForum) {
        if (!Array.isArray(data.topico)) {
            data.topico = [];
        }

        if (topicId) {
            const existingTopic = data.topico.find(t => String(t.id) === String(topicId));
            if (existingTopic) {
                if (topicName && existingTopic.name !== topicName) {
                    existingTopic.name = topicName;
                }
            } else {
                data.topico.push({
                    id: String(topicId),
                    name: topicName || `Tópico ${topicId}`,
                    settings: {}
                });
            }
        }
    } else {
        data.topico = null;
    }

    const context = {
        raw: {
            chat: {
                id: chatId,
                title: chatTitle || data.chatName || data.groupName || data.serverName || null
            }
        },
        serverName: chatTitle || data.serverName || null,
        groupName: chatTitle || data.groupName || null,
        chatName: topicName && chatTitle
            ? `${chatTitle} / ${topicName}`
            : (chatTitle || data.chatName || data.groupName || null)
    };

    saveSettings("telegram", chatId, "group", data, context);
}

/**
 * Sincroniza a hierarquia no WhatsApp, migrando configurações se o grupo entrar/sair de uma comunidade.
 */
function setWhatsAppCommunityAnnouncementGroup(groupId, communityId = null, announcementGroupId = null, announcementName = null) {
    if (!groupId || !communityId) return false;

    ensureDirectoryExistence();

    const selectedGroupId = announcementGroupId || groupId;
    const resolvedName = (announcementName || "").trim();

    const communityData = loadSettings("whatsapp", communityId, "community");

    if (!Array.isArray(communityData.chat)) {
        communityData.chat = [];
    }

    const existingChat = communityData.chat.find(c => c.id === selectedGroupId);
    if (!existingChat) {
        communityData.chat.push({
            id: selectedGroupId,
            topico: null,
            settings: {}
        });
    }

    communityData.server = communityId;
    communityData.serverName = resolvedName || communityData.serverName || "Comunidade";
    communityData.groupName = resolvedName || communityData.groupName || "Comunidade";
    communityData.chatName = resolvedName || communityData.chatName || "Comunidade";
    communityData.announcementChannel = true;
    communityData.announcementGroupId = String(selectedGroupId);
    communityData.announcementName = resolvedName || communityData.announcementName || null;
    communityData.communityNameConfigured = Boolean(communityData.announcementName);

    saveSettings("whatsapp", communityId, "community", communityData, {
        raw: {
            chat: {
                id: selectedGroupId,
                title: resolvedName || null
            }
        },
        serverName: null,
        groupName: null,
        chatName: null,
        categoryName: null
    });

    const groupData = loadSettings("whatsapp", selectedGroupId, "group");
    groupData.server = communityId;
    groupData.serverName = resolvedName || groupData.serverName || null;
    groupData.groupName = resolvedName || groupData.groupName || null;
    groupData.chatName = resolvedName || groupData.chatName || null;
    groupData.announcementChannel = true;
    groupData.announcementGroupId = String(selectedGroupId);
    groupData.announcementName = resolvedName || groupData.announcementName || null;
    groupData.communityNameConfigured = Boolean(groupData.announcementName);

    saveSettings("whatsapp", selectedGroupId, "group", groupData, {
        raw: {
            chat: {
                id: selectedGroupId,
                title: resolvedName || null
            }
        },
        serverName: null,
        groupName: null,
        chatName: null,
        categoryName: null
    });

    return true;
}

function syncWhatsAppHierarchy(groupId, communityId = null, groupName = null, communityName = null) {
    if (!groupId) return;

    ensureDirectoryExistence();

    const groupContext = {
        raw: {
            chat: {
                id: groupId,
                title: groupName || null
            }
        },
        serverName: null,
        groupName: null,
        chatName: null,
        categoryName: null
    };

    if (communityId) {
        // O grupo pertence a uma comunidade
        const communityData = loadSettings("whatsapp", communityId, "community");
        const communityContext = {
            ...groupContext,
            serverName: null,
            groupName: null,
            chatName: null,
            categoryName: null
        };

        if (!Array.isArray(communityData.chat)) {
            communityData.chat = [];
        }

        // Verifica se existia arquivo standalone para esse grupo e importa as configs
        const standaloneFilename = getFilename("whatsapp", groupId, "group");
        const standalonePath = path.join(groupsDir, standaloneFilename);
        let settingsToImport = {};

        if (fs.existsSync(standalonePath)) {
            try {
                const standaloneData = JSON.parse(fs.readFileSync(standalonePath, "utf8"));
                settingsToImport = standaloneData.settings || {};
                fs.unlinkSync(standalonePath);
                console.log(`[groupSettings] WhatsApp group ${groupId} migrado para a comunidade ${communityId}. Arquivo antigo deletado.`);
            } catch (err) {
                console.error(`[groupSettings] Erro ao migrar config do grupo standalone ${groupId}:`, err);
            }
        }

        const existingChat = communityData.chat.find(c => c.id === groupId);
        if (existingChat) {
            if (Object.keys(settingsToImport).length > 0) {
                existingChat.settings = { ...existingChat.settings, ...settingsToImport };
            }
        } else {
            communityData.chat.push({
                id: groupId,
                topico: null,
                settings: settingsToImport
            });
        }

        communityData.server = communityId || communityData.server || null;
        communityData.announcementChannel = Boolean(communityData.announcementChannel || communityData.announcementGroupId || communityData.announcementName);
        if (!communityData.communityNameConfigured && communityData.announcementName) {
            communityData.communityNameConfigured = true;
        }
        if (communityData.communityNameConfigured && communityData.announcementName) {
            communityData.serverName = communityData.announcementName;
            communityData.groupName = communityData.announcementName;
            communityData.chatName = communityData.announcementName;
        }

        const groupData = loadSettings("whatsapp", groupId, "group");
        if (Object.keys(settingsToImport).length > 0) {
            groupData.settings = { ...groupData.settings, ...settingsToImport };
        }
        groupData.server = communityId || groupData.server || null;
        groupData.announcementChannel = Boolean(groupData.announcementChannel || groupData.announcementGroupId || groupData.announcementName);
        if (groupData.communityNameConfigured && groupData.announcementName) {
            groupData.serverName = groupData.announcementName;
            groupData.groupName = groupData.announcementName;
            groupData.chatName = groupData.announcementName;
        }

        saveSettings("whatsapp", communityId, "community", communityData, communityContext);
        saveSettings("whatsapp", groupId, "group", groupData, groupContext);
    } else {
        // Grupo standalone/avulso.
        // Verifica se o grupo anteriormente pertencia a alguma comunidade e remove
        let settingsFromCommunity = null;
        let foundCommunityId = null;

        const files = fs.readdirSync(groupsDir);
        for (const file of files) {
            if (file.startsWith("waC") && file.endsWith(".json")) {
                try {
                    const filePath = path.join(groupsDir, file);
                    const commData = JSON.parse(fs.readFileSync(filePath, "utf8"));
                    if (Array.isArray(commData.chat)) {
                        const index = commData.chat.findIndex(c => c.id === groupId);
                        if (index !== -1) {
                            settingsFromCommunity = commData.chat[index].settings || {};
                            commData.chat.splice(index, 1);
                            foundCommunityId = commData.server;

                            if (commData.chat.length === 0) {
                                fs.unlinkSync(filePath);
                                console.log(`[groupSettings] Comunidade vazia e deletada: ${file}`);
                            } else {
                                fs.writeFileSync(filePath, JSON.stringify(commData, null, 4), "utf8");
                            }
                            break;
                        }
                    }
                } catch (err) {
                    console.error(`[groupSettings] Erro ao ler/remover da comunidade ${file}:`, err);
                }
            }
        }

        const data = loadSettings("whatsapp", groupId, "group");
        if (settingsFromCommunity) {
            data.settings = { ...data.settings, ...settingsFromCommunity };
            console.log(`[groupSettings] WhatsApp group ${groupId} removido da comunidade ${foundCommunityId}. Configurações mantidas.`);
        }

        saveSettings("whatsapp", groupId, "group", {
            ...data,
            server: communityId || data.server || null,
            announcementChannel: Boolean(data.announcementChannel || data.announcementGroupId || data.announcementName)
        }, groupContext);
    }
}

module.exports = {
    loadSettings,
    saveSettings,
    deleteSettingsFile,
    syncDiscordHierarchy,
    syncTelegramHierarchy,
    syncWhatsAppHierarchy,
    setWhatsAppCommunityAnnouncementGroup,
    ensureSettingsMetadata,
    buildMetadataContext
};
