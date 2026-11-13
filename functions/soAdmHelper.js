const { loadSettings, saveSettings } = require("./groupSettings");

function getTarget(message) {
    const platform = message?.platform;
    if (!["discord", "telegram", "whatsapp"].includes(platform)) {
        throw new Error("Plataforma inválida para o modo somente administradores.");
    }

    const id = platform === "discord"
        ? String(message.raw?.guild?.id || message.guildId || message.groupId || "")
        : String(message.chatId || message.groupId || "");
    if (!id) throw new Error("Não foi possível identificar o grupo ou servidor.");

    return {
        platform,
        id,
        type: platform === "discord" ? "server" : "group"
    };
}

function getConfig(message) {
    const target = getTarget(message);
    const data = loadSettings(target.platform, target.id, target.type);
    return data.settings?.soadm || { enabled: false };
}

function isEnabled(message) {
    return getConfig(message).enabled === true;
}

function setEnabled(message, enabled) {
    if (typeof enabled !== "boolean") {
        throw new Error("O estado do modo somente administradores é inválido.");
    }
    const target = getTarget(message);
    const data = loadSettings(target.platform, target.id, target.type);
    data.settings = data.settings || {};
    data.settings.soadm = { ...(data.settings.soadm || {}), enabled };
    if (!saveSettings(target.platform, target.id, target.type, data)) {
        throw new Error("Não foi possível salvar o modo somente administradores.");
    }
    return data.settings.soadm;
}

module.exports = { getConfig, isEnabled, setEnabled };
