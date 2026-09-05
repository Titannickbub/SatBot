const { loadSettings, saveSettings } = require("./groupSettings");

/**
 * Retorna se o AutoDownload está ativado para o chat da mensagem fornecida.
 * - No PV (isPrivate): Sempre `true` (ativo).
 * - Em Grupos (!isPrivate): Inicialmente `false` (inativo), a menos que tenha sido ativado nas configurações do grupo.
 * 
 * @param {object} message 
 * @returns {boolean}
 */
function isAutoDownloadEnabledForChat(message) {
    if (!message) return false;

    // No PV, o autodownload é sempre ativo por padrão
    if (message.isPrivate) {
        return true;
    }

    const { platform, chatId, threadId, raw } = message;

    if (platform === "whatsapp") {
        if (!chatId || !chatId.endsWith("@g.us")) {
            return false;
        }

        function getAutoDownloadSettings(message) {
            if (!message || message.isPrivate) return { enabled: true, deletelink: false };
            const { platform, chatId, threadId, raw } = message;
            let data;
            if (platform === "discord") {
                const guildId = raw?.guild?.id || message.guildId;
                const targetId = guildId || chatId;
                if (!targetId) return { enabled: false, deletelink: false };
                data = loadSettings("discord", targetId, guildId ? "server" : "group");
            } else {
                if (!chatId) return { enabled: false, deletelink: false };
                data = loadSettings(platform, chatId, "group");
                if (platform === "telegram" && threadId && Array.isArray(data.topico)) {
                    const topic = data.topico.find(t => String(t.id) === String(threadId));
                    if (topic?.settings?.autodownload) return topic.settings.autodownload;
                }
            }
            return data.settings?.autodownload || { enabled: false, deletelink: false };
        }

        function setAutoDownloadDeleteLink(message, enabled) {
            if (!message || message.isPrivate) return false;
            const { platform, chatId, raw } = message;
            let type = "group";
            let targetId = chatId;
            if (platform === "discord") {
                targetId = raw?.guild?.id || message.guildId || chatId;
                type = raw?.guild?.id || message.guildId ? "server" : "group";
            }
            if (!targetId) return false;
            const data = loadSettings(platform, targetId, type);
            data.settings = data.settings || {};
            data.settings.autodownload = { ...data.settings.autodownload, deletelink: !!enabled };
            saveSettings(platform, targetId, type, data);
            return !!enabled;
        }
        const groupData = loadSettings("whatsapp", chatId, "group");
        return groupData.settings?.autodownload?.enabled === true;
    }

    if (platform === "telegram") {
        if (!chatId) return false;
        const groupData = loadSettings("telegram", chatId, "group");

        if (threadId && Array.isArray(groupData.topico)) {
            const topic = groupData.topico.find(t => String(t.id) === String(threadId));
            if (topic && topic.settings?.autodownload?.enabled !== undefined) {
                return topic.settings.autodownload.enabled === true;
            }
        }

        return groupData.settings?.autodownload?.enabled === true;
    }

    if (platform === "discord") {
        const guildId = raw?.guild?.id || message.guildId;
        const targetId = guildId || chatId;
        if (!targetId) return false;
        const serverData = loadSettings("discord", targetId, guildId ? "server" : "group");
        return serverData.settings?.autodownload?.enabled === true;
    }

    return false;
}

function getAutoDownloadSettings(message) {
    if (!message || message.isPrivate) return { enabled: true, deletelink: false };
    const { platform, chatId, threadId, raw } = message;
    const guildId = raw?.guild?.id || message.guildId;
    const targetId = platform === "discord" ? (guildId || chatId) : chatId;
    if (!targetId) return { enabled: false, deletelink: false };
    const data = loadSettings(platform, targetId, platform === "discord" && guildId ? "server" : "group");
    if (platform === "telegram" && threadId && Array.isArray(data.topico)) {
        const topic = data.topico.find(t => String(t.id) === String(threadId));
        if (topic?.settings?.autodownload) return topic.settings.autodownload;
    }
    return data.settings?.autodownload || { enabled: false, deletelink: false };
}

function setAutoDownloadDeleteLink(message, enabled) {
    if (!message || message.isPrivate) return false;
    const { platform, chatId, raw } = message;
    const guildId = raw?.guild?.id || message.guildId;
    const targetId = platform === "discord" ? (guildId || chatId) : chatId;
    if (!targetId) return false;
    const type = platform === "discord" && guildId ? "server" : "group";
    const data = loadSettings(platform, targetId, type);
    data.settings = data.settings || {};
    data.settings.autodownload = { ...data.settings.autodownload, deletelink: !!enabled };
    saveSettings(platform, targetId, type, data);
    return !!enabled;
}

/**
 * Ativa ou desativa o AutoDownload para um grupo/chat.
 * 
 * @param {object} message 
 * @param {boolean} enabled 
 * @returns {boolean} Novo estado de ativado/desativado.
 */
function setAutoDownloadForGroup(message, enabled) {
    if (!message || message.isPrivate) {
        return false;
    }

    const { platform, chatId, raw } = message;
    const targetState = !!enabled;

    if (platform === "whatsapp") {
        if (!chatId) return false;
        const groupData = loadSettings("whatsapp", chatId, "group");
        groupData.settings = groupData.settings || {};
        groupData.settings.autodownload = {
            ...groupData.settings.autodownload,
            enabled: targetState
        };
        saveSettings("whatsapp", chatId, "group", groupData);
        return targetState;
    }

    if (platform === "telegram") {
        if (!chatId) return false;
        const groupData = loadSettings("telegram", chatId, "group");
        groupData.settings = groupData.settings || {};
        groupData.settings.autodownload = {
            ...groupData.settings.autodownload,
            enabled: targetState
        };
        saveSettings("telegram", chatId, "group", groupData);
        return targetState;
    }

    if (platform === "discord") {
        const guildId = raw?.guild?.id || message.guildId;
        const targetId = guildId || chatId;
        if (!targetId) return false;
        const type = guildId ? "server" : "group";
        const serverData = loadSettings("discord", targetId, type);
        serverData.settings = serverData.settings || {};
        serverData.settings.autodownload = {
            ...serverData.settings.autodownload,
            enabled: targetState
        };
        saveSettings("discord", targetId, type, serverData);
        return targetState;
    }

    return false;
}

module.exports = {
    isAutoDownloadEnabledForChat,
    setAutoDownloadForGroup,
    getAutoDownloadSettings,
    setAutoDownloadDeleteLink
};
