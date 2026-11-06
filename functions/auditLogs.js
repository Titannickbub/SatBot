const groupSettings = require("./groupSettings");
const sender = require("./send");
const centralAccounts = require("./centralAccounts");
const { isOwner } = require("./owners");

const CATEGORIES = Object.freeze({
    balance: "saldo",
    store: "loja local",
    signals: "loja de sinais local",
    warnings: "advertências"
});

function getTarget(message) {
    if (!message || message.isPrivate) return null;
    if (message.platform === "discord") {
        const id = message.raw?.guild?.id || message.raw?.guildId || message.guildId;
        return id ? { id: String(id), type: "server" } : null;
    }
    return message.chatId ? { id: String(message.chatId), type: "group" } : null;
}

function getConfig(message) {
    const target = getTarget(message);
    if (!target) return null;
    const data = groupSettings.loadSettings(message.platform, target.id, target.type);
    const config = data.settings?.auditLogs || {};
    return {
        enabled: config.enabled !== false,
        categories: Object.fromEntries(Object.keys(CATEGORIES).map(category => [
            category,
            config.categories?.[category] !== false
        ])),
        topicId: config.topicId ? String(config.topicId) : ""
    };
}

function updateConfig(message, updates) {
    const target = getTarget(message);
    if (!target || !updates || typeof updates !== "object" || Array.isArray(updates)) return null;
    const data = groupSettings.loadSettings(message.platform, target.id, target.type);
    data.settings = data.settings || {};
    const config = getConfig(message);
    if (typeof updates.enabled === "boolean") config.enabled = updates.enabled;
    if (updates.categories && typeof updates.categories === "object" && !Array.isArray(updates.categories)) {
        for (const category of Object.keys(CATEGORIES)) {
            if (typeof updates.categories[category] === "boolean") {
                config.categories[category] = updates.categories[category];
            }
        }
    }
    if (updates.category && Object.hasOwn(CATEGORIES, updates.category) &&
        typeof updates.categoryEnabled === "boolean") {
        config.categories[updates.category] = updates.categoryEnabled;
    }
    if (updates.topicId === null || typeof updates.topicId === "string") {
        config.topicId = updates.topicId || "";
    }
    data.settings.auditLogs = config;
    if (!groupSettings.saveSettings(message.platform, target.id, target.type, data, { raw: message.raw })) {
        throw new Error("Não foi possível salvar as configurações dos logs.");
    }
    return config;
}

function describeActor(message) {
    const central = message.userId
        ? centralAccounts.findByPlatform(message.platform, String(message.userId))
        : null;
    const platformAccount = central?.platformAccounts?.find(account =>
        account.platform === message.platform && String(account.platformId) === String(message.userId)
    );
    return formatMember(
        message,
        message.userId,
        message.displayName || message.raw?.pushName || message.username ||
            platformAccount?.displayName || platformAccount?.username || central?.name,
        "Administrador"
    );
}

function formatMember(message, userId, displayName, fallback = "Membro") {
    const id = String(userId || "");
    const central = id ? centralAccounts.findByPlatform(message?.platform, id) : null;
    const platformAccount = central?.platformAccounts?.find(account =>
        account.platform === message?.platform && String(account.platformId) === id
    );
    const candidates = [
        displayName,
        message?.raw?.pushName,
        message?.username,
        platformAccount?.displayName,
        platformAccount?.username,
        central?.name
    ];
    const name = candidates.find(value => {
        const normalized = String(value || "").trim();
        return normalized && normalized !== id && !/^\d+(?:@(?:lid|s\.whatsapp\.net|g\.us))?$/i.test(normalized);
    });
    if (message?.platform === "discord" && /^\d{15,25}$/.test(id)) return `<@${id}>`;
    if (name) return `@${String(name).trim().replace(/^[@#]+/, "")}`;
    if (message?.platform === "whatsapp" && fallback === "Administrador") return fallback;
    if (id) return `${fallback} (${id})`;
    return fallback;
}

async function log(message, category, detail) {
    if (!Object.hasOwn(CATEGORIES, category)) throw new Error(`Categoria de log inválida: ${category}`);
    const config = getConfig(message);
    if (!config || !config.enabled || !config.categories[category]) return false;

    let chatId = String(message.chatId || "");
    let threadId = null;
    if (message.platform === "discord") {
        const target = getTarget(message);
        const data = groupSettings.loadSettings("discord", target.id, target.type);
        chatId = String(data.settings?.logsChannelId || "");
        if (!chatId) {
            console.warn("[AUDIT_LOG] Logs ativados, mas nenhum canal de logs do Discord foi selecionado.");
            return false;
        }
    } else if (message.platform === "telegram" && config.topicId) {
        threadId = config.topicId;
    }
    if (!chatId) return false;

    try {
        await sender.text(
            message.platform,
            chatId,
            threadId,
            `📋・${CATEGORIES[category].toLocaleUpperCase("pt-BR")}\n${detail}`,
            { disableMentions: true }
        );
        return true;
    } catch (error) {
        console.error(`[AUDIT_LOG] Falha ao enviar log de ${category}:`, error.message || error);
        return false;
    }
}

function canConfigure(message) {
    if (isOwner(message) || message.sender?.isAdmin || message.sender?.isOwner) return true;
    const adapter = (message.platforms || []).find(platform => platform.name === message.platform);
    return adapter?.checkUserPermission
        ? adapter.checkUserPermission(String(message.chatId), String(message.userId))
        : false;
}

module.exports = {
    CATEGORIES,
    canConfigure,
    describeActor,
    formatMember,
    getConfig,
    getTarget,
    log,
    updateConfig
};
