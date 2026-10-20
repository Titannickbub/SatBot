const { loadSettings, saveSettings } = require("./groupSettings");
const { getDiscordChatFeatureSetting, setDiscordChatFeatureSetting } = require("./discordChatSettings");

function getAutoDownloadTarget(message) {
    if (!message?.platform) return null;

    const { platform, chatId } = message;
    if (platform === "discord") {
        const guildId = message.guildId || message.raw?.guild?.id;
        const targetId = guildId || chatId;
        if (!targetId) return null;
        return { platform, targetId, type: guildId ? "server" : "chat" };
    }

    if (!chatId) return null;

    if (platform === "whatsapp") {
        return { platform, targetId: chatId, type: "group" };
    }

    if (platform === "telegram") {
        const type = message.isPrivate ? "chat" : (message.isChannel ? "channel" : "group");
        return { platform, targetId: chatId, type };
    }

    return { platform, targetId: chatId, type: message.isPrivate ? "chat" : "group" };
}

function getAutoDownloadSettings(message) {
    if (message?.platform === "discord" && !message.isPrivate) {
        const setting = getDiscordChatFeatureSetting(message, "autodownload");
        return {
            enabled: setting?.enabled === true,
            deletelink: setting?.deletelink === true
        };
    }

    const target = getAutoDownloadTarget(message);
    const defaultSettings = {
        enabled: !!message?.isPrivate,
        deletelink: false
    };
    if (!target) return defaultSettings;

    const data = loadSettings(target.platform, target.targetId, target.type);
    return {
        ...defaultSettings,
        ...data.settings?.autodownload,
        enabled: message.isPrivate ? true : data.settings?.autodownload?.enabled === true
    };
}

function isAutoDownloadEnabledForChat(message) {
    return getAutoDownloadSettings(message).enabled === true;
}

function saveAutoDownloadSettings(message, changes) {
    if (message?.platform === "discord" && !message.isPrivate) {
        const existing = getDiscordChatFeatureSetting(message, "autodownload") || {};
        setDiscordChatFeatureSetting(message, "autodownload", {
            ...existing,
            ...changes
        });
        return true;
    }

    const target = getAutoDownloadTarget(message);
    if (!target) {
        throw new Error("Não foi possível identificar o chat atual.");
    }

    const data = loadSettings(target.platform, target.targetId, target.type);
    data.settings = data.settings || {};
    data.settings.autodownload = {
        ...data.settings.autodownload,
        ...changes
    };
    if (!saveSettings(target.platform, target.targetId, target.type, data)) {
        throw new Error("Não foi possível salvar as configurações do AutoDownload.");
    }
    return true;
}

function setAutoDownloadForGroup(message, enabled) {
    if (!message) return false;
    if (message.isPrivate) return true;
    saveAutoDownloadSettings(message, { enabled: !!enabled });
    return !!enabled;
}

function setAutoDownloadDeleteLink(message, enabled) {
    if (!message) return false;
    saveAutoDownloadSettings(message, { deletelink: !!enabled });
    return !!enabled;
}

module.exports = {
    isAutoDownloadEnabledForChat,
    setAutoDownloadForGroup,
    getAutoDownloadSettings,
    setAutoDownloadDeleteLink
};
