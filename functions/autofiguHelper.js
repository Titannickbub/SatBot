const { loadSettings, saveSettings } = require("./groupSettings");

function getChatContext(message) {
    if (!message || !["whatsapp", "telegram"].includes(message.platform)) {
        throw new Error("O Autofigu está disponível apenas no WhatsApp e Telegram.");
    }

    const chatId = message.chatId || message.groupId;
    if (message.isPrivate || !chatId) {
        throw new Error("O Autofigu só pode ser configurado em grupos ou canais.");
    }

    const type = message.platform === "telegram" &&
        (message.chatType === "channel" || message.raw?.chat?.type === "channel")
        ? "channel"
        : "group";

    return { chatId: String(chatId), type };
}

function getAutofiguEnabled(message) {
    if (!message || !["whatsapp", "telegram"].includes(message.platform) || message.isPrivate) {
        return false;
    }

    const { chatId, type } = getChatContext(message);
    const data = loadSettings(message.platform, chatId, type);
    return data.settings?.autofigu?.enabled === true;
}

function setAutofiguEnabled(message, enabled) {
    if (typeof enabled !== "boolean") {
        throw new Error("O estado do Autofigu deve ser ativado ou desativado.");
    }

    const { chatId, type } = getChatContext(message);
    const data = loadSettings(message.platform, chatId, type);
    data.settings = data.settings || {};
    data.settings.autofigu = {
        enabled,
        updatedAt: Date.now(),
        updatedBy: message.userId || null
    };

    if (!saveSettings(message.platform, chatId, type, data, { raw: message.raw })) {
        throw new Error("Não foi possível salvar a configuração do Autofigu.");
    }

    return enabled;
}

module.exports = {
    getAutofiguEnabled,
    setAutofiguEnabled
};
