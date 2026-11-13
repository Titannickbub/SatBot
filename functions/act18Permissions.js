const groupSettings = require("./groupSettings");

function isAllowed(message) {
    const platform = String(message?.platform || "").toLowerCase();
    const raw = message?.raw || {};

    if (platform === "discord") {
        const channel = raw.channel || {};
        return message?.adultContentAllowed === true ||
            channel.nsfw === true ||
            channel.parent?.nsfw === true;
    }

    if (platform === "telegram") {
        const chat = raw.chat || {};
        return message?.adultContentAllowed === true ||
            chat.has_protected_content === true;
    }

    if (platform === "whatsapp") {
        if (message?.isPrivate || message?.isCommunity || !message?.chatId) return false;
        const settings = groupSettings.loadSettings("whatsapp", String(message.chatId), "group");
        return settings?.settings?.adultMode === true;
    }

    return false;
}

function denialText(message) {
    const platform = String(message?.platform || "").toLowerCase();
    if (platform === "discord") {
        return "❌ O comando act18 só funciona em canais com restrição de idade ativada.";
    }
    if (platform === "telegram") {
        return "❌ O comando act18 só funciona em grupos com a proteção para salvar e encaminhar mídias ativada.";
    }
    if (platform === "whatsapp") {
        return `❌ Ative o modo adulto do grupo com ${message?.prefix || "!"}modo_adulto on para usar os comandos act18.`;
    }
    return "❌ O comando act18 não está disponível nesta plataforma.";
}

module.exports = { isAllowed, denialText };
