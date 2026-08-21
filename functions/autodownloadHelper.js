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
    setAutoDownloadForGroup
};
