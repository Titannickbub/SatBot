const fs = require("fs");
const path = require("path");
const { loadSettings, saveSettings } = require("./groupSettings");
const { getAvailableLevels } = require("./antilinkHelper");

const groupsDir = path.join(__dirname, "..", "settings", "groups");

function findWhatsAppCommunity(groupId) {
    if (!fs.existsSync(groupsDir)) return null;

    for (const file of fs.readdirSync(groupsDir)) {
        if (!file.startsWith("waC") || !file.endsWith(".json")) continue;
        try {
            const data = JSON.parse(fs.readFileSync(path.join(groupsDir, file), "utf8"));
            if (Array.isArray(data.chat) && data.chat.some(chat => chat.id === groupId)) {
                return { id: data.server, data };
            }
        } catch (error) {
            console.error(`[AUTO-TRANSCRIBE] Falha ao ler configurações da comunidade ${file}:`, error);
        }
    }

    return null;
}

function findDiscordChat(serverData, channelId) {
    const standalone = (serverData.chat || []).find(chat => chat.id === channelId);
    if (standalone) return standalone;

    for (const category of serverData.categoria || []) {
        const chat = (category.chat || []).find(item => item.id === channelId);
        if (chat) return chat;
    }

    return null;
}

function getConfigurationNode(message, level) {
    const { platform, chatId, threadId, raw } = message;

    if (platform === "discord") {
        const serverId = raw?.guild?.id;
        if (!serverId) return null;

        const data = loadSettings("discord", String(serverId), "server");
        if (level === "server") {
            return { data, settings: data.settings, platform, id: String(serverId), type: "server" };
        }

        const channel = raw?.channel;
        if (level === "categoria") {
            const categoryId = channel?.parentId;
            const category = (data.categoria || []).find(item => item.id === String(categoryId));
            return category ? { data, settings: category.settings, platform, id: String(serverId), type: "server" } : null;
        }

        if (level === "chat") {
            const isThread = Boolean(channel?.isThread?.());
            const channelId = String(isThread ? channel.parentId : channel?.id || chatId);
            const chat = findDiscordChat(data, channelId);
            if (!chat) return null;
            if (isThread) {
                const topic = (chat.topico || []).find(item => item.id === String(channel.id));
                return topic ? { data, settings: topic.settings, platform, id: String(serverId), type: "server" } : null;
            }
            return { data, settings: chat.settings, platform, id: String(serverId), type: "server" };
        }
    }

    if (platform === "whatsapp") {
        if (!chatId?.endsWith("@g.us")) return null;
        const community = findWhatsAppCommunity(chatId);
        if (community) {
            if (level === "server") {
                return { data: community.data, settings: community.data.settings, platform, id: String(community.id), type: "community" };
            }
            if (level === "chat") {
                const group = (community.data.chat || []).find(item => item.id === chatId);
                return group ? { data: community.data, settings: group.settings, platform, id: String(community.id), type: "community" } : null;
            }
            return null;
        }

        if (level === "server" || level === "chat") {
            const data = loadSettings("whatsapp", String(chatId), "group");
            return { data, settings: data.settings, platform, id: String(chatId), type: "group" };
        }
        return null;
    }

    if (platform === "telegram") {
        const type = message.chatType === "channel" || raw?.chat?.type === "channel" ? "channel" : "group";
        const data = loadSettings("telegram", String(chatId), type);
        if (level === "server" || (level === "chat" && !threadId)) {
            return { data, settings: data.settings, platform, id: String(chatId), type };
        }
        if (level === "chat" && threadId) {
            const topic = (data.topico || []).find(item => item.id === String(threadId));
            return topic ? { data, settings: topic.settings, platform, id: String(chatId), type } : null;
        }
    }

    return null;
}

function readEnabled(settings) {
    const enabled = settings?.autoTranscribe?.enabled;
    return typeof enabled === "boolean" ? enabled : null;
}

function getAutoTranscribeState(message) {
    if (!message || message.isPrivate) return { enabled: false, level: null };

    const levels = getAvailableLevels(message);
    let state = { enabled: false, level: null };
    for (const level of levels) {
        const node = getConfigurationNode(message, level);
        const enabled = readEnabled(node?.settings);
        if (enabled !== null) state = { enabled, level };
    }
    return state;
}

function getAutoTranscribeSetting(message, level) {
    if (!message || message.isPrivate) return false;
    const node = getConfigurationNode(message, level);
    return readEnabled(node?.settings) === true;
}

function setAutoTranscribeSetting(message, level, enabled) {
    if (message?.isPrivate) {
        throw new Error("A transcrição automática não pode ser configurada em conversas privadas.");
    }
    if (typeof enabled !== "boolean") {
        throw new TypeError("O estado da transcrição automática deve ser ativado ou desativado.");
    }

    const node = getConfigurationNode(message, level);
    if (!node) {
        throw new Error(`Não foi possível encontrar as configurações do nível ${level}.`);
    }

    if (node.settings === undefined) node.settings = {};
    node.settings.autoTranscribe = {
        enabled,
        updatedAt: Date.now(),
        updatedBy: message.userId || null
    };
    if (!saveSettings(node.platform, node.id, node.type, node.data, { raw: message.raw })) {
        throw new Error("Não foi possível salvar as configurações de transcrição automática.");
    }

    return enabled;
}

module.exports = {
    getAutoTranscribeState,
    getAutoTranscribeSetting,
    setAutoTranscribeSetting
};
