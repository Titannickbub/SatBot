const { loadSettings, saveSettings } = require("./groupSettings");
const configFn = require("./config");
const { getDiscordChatFeatureSetting, setDiscordChatFeatureSetting } = require("./discordChatSettings");

/**
 * Normaliza a string do modo Auto-IA
 */
function normalizeMode(modeStr) {
    if (!modeStr || typeof modeStr !== "string") return "off";
    const clean = modeStr.trim().toLowerCase();

    if (["off", "desativado", "desligar", "0", "false", "desativar"].includes(clean)) {
        return "off";
    }
    if (["all", "todas", "tudo", "1", "true", "ligar", "todas_mensagens"].includes(clean)) {
        return "all";
    }
    if (["mention", "mencao", "citarem", "citar", "marcar", "tag", "marcação"].includes(clean)) {
        return "mention";
    }
    return null;
}

/**
 * Retorna o tipo de chat de acordo com a plataforma (group, server, etc.)
 */
function getChatType(message) {
    if (message.platform === "discord") {
        return message.guildId ? "server" : "chat";
    }
    if (message.platform === "whatsapp") {
        return message.isCommunity ? "community" : "group";
    }
    if (message.platform === "telegram") {
        return message.isChannel ? "channel" : "group";
    }
    return "group";
}

/**
 * Obtém o modo de Auto-IA configurado para um grupo/chat
 */
function getAutoIAMode(message) {
    if (message.isPrivate) return "off";

    const platform = message.platform;
    if (platform === "discord") {
        const modeSetting = getDiscordChatFeatureSetting(message, "autoIA", ["autoia"]);
        return normalizeMode(String(modeSetting?.mode || modeSetting || "off")) || "off";
    }

    const chatId = message.guildId || message.chatId || message.groupId;
    const type = getChatType(message);

    if (!platform || !chatId) return "off";

    const data = loadSettings(platform, chatId, type);
    const modeSetting = data?.settings?.autoIA?.mode || data?.settings?.autoia?.mode || data?.settings?.autoIA || "off";
    return normalizeMode(String(modeSetting)) || "off";
}

/**
 * Define o modo de Auto-IA para um grupo/chat
 */
function setAutoIAMode(message, targetMode) {
    const normalized = normalizeMode(targetMode);
    if (!normalized) {
        throw new Error("Modo inválido. Use: off, all (todas) ou mention (mencao).");
    }

    const platform = message.platform;
    if (platform === "discord") {
        setDiscordChatFeatureSetting(message, "autoIA", {
            mode: normalized,
            updatedAt: Date.now(),
            updatedBy: message.userId || null
        });
        return normalized;
    }

    const chatId = message.guildId || message.chatId || message.groupId;
    const type = getChatType(message);

    if (!platform || !chatId) {
        throw new Error("Não foi possível identificar o chat atual.");
    }

    const data = loadSettings(platform, chatId, type);
    data.settings = data.settings || {};
    data.settings.autoIA = {
        mode: normalized,
        updatedAt: Date.now(),
        updatedBy: message.userId || null
    };

    saveSettings(platform, chatId, type, data);
    return normalized;
}

/**
 * Verifica se a mensagem deve acionar o Auto-IA de acordo com o modo configurado
 */
function shouldTriggerAutoIA(message, mode, botName) {
    if (mode === "off") return false;
    if (mode === "all") return true;

    if (mode === "mention") {
        const text = (message.text || "").toLowerCase();
        const fallbackBotName = typeof configFn?.getBotName === "function" ? configFn.getBotName() : "Sat Bot";
        const currentBotName = (botName || fallbackBotName || "Sat Bot").toLowerCase().trim();

        // 1. Resposta a uma mensagem do bot (reply/quoted)
        if (message.quoted) {
            const cleanQuotedUser = message.quoted.userId ? String(message.quoted.userId).replace(/[^0-9]/g, "") : "";
            const cleanBotNum = message.botId ? String(message.botId).replace(/[^0-9]/g, "") : "";
            const cleanBotLid = message.botLid ? String(message.botLid).replace(/[^0-9]/g, "") : "";

            const isBotMessage = message.quoted.fromMe === true ||
                message.quoted.isBot === true ||
                (cleanQuotedUser && cleanBotNum && cleanQuotedUser === cleanBotNum) ||
                (cleanQuotedUser && cleanBotLid && cleanQuotedUser === cleanBotLid);

            if (isBotMessage) {
                return true;
            }
        }

        // 2. Marcação / Menção nativa por JID ou @ (mentionedJids)
        if (Array.isArray(message.mentionedJids) && message.mentionedJids.length > 0) {
            const botIds = [];
            if (message.botId) botIds.push(String(message.botId).replace(/[^0-9]/g, ""));
            if (message.botLid) botIds.push(String(message.botLid).replace(/[^0-9]/g, ""));
            if (message.botUsername) botIds.push(String(message.botUsername).toLowerCase().replace(/^@/, ""));

            const isTag = message.mentionedJids.some(jid => {
                const cleanJid = String(jid).toLowerCase().replace(/[^a-z0-9_]/g, "");
                return botIds.some(bid => bid && cleanJid && (cleanJid === bid || cleanJid.includes(bid) || bid.includes(cleanJid)));
            });

            if (isTag) return true;
        }

        // 3. Marcação textual por ID ou Username no texto (Discord <@id>, Telegram @username, WhatsApp @phone/@LID)
        if (message.botId) {
            const cleanBotNum = String(message.botId).replace(/[^0-9]/g, "");
            if (cleanBotNum && text.includes(cleanBotNum)) return true;
        }

        if (message.botLid) {
            const cleanBotLid = String(message.botLid).replace(/[^0-9]/g, "");
            if (cleanBotLid && text.includes(cleanBotLid)) return true;
        }

        if (message.botUsername) {
            const cleanUsername = String(message.botUsername).toLowerCase().replace(/^@/, "");
            if (cleanUsername && text.includes(`@${cleanUsername}`)) return true;
        }

        // 4. Marcação por @ <nome_definido_do_bot>
        if (currentBotName && text.includes(`@${currentBotName}`)) {
            return true;
        }

        // 5. Citação do nome do bot estritamente conforme configurado
        if (currentBotName && text.includes(currentBotName)) {
            return true;
        }
    }

    return false;
}

module.exports = {
    normalizeMode,
    getAutoIAMode,
    setAutoIAMode,
    shouldTriggerAutoIA
};
