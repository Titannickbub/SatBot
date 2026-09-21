const xp = require("./xp");

function isAdmin(message) {
    return Boolean(message.sender?.isAdmin || message.sender?.isOwner);
}

function parseXp(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    if (!/^\d+$/.test(normalized)) return null;
    const amount = Number(normalized);
    return Number.isSafeInteger(amount) ? amount : null;
}

function resolveTarget(message, targetArgument) {
    const candidates = [
        message.quoted?.userId,
        message.platform === "discord" ? message.raw?.mentions?.users?.first()?.id : null,
        ...(message.mentionedJids || []),
        targetArgument
    ].filter(Boolean);

    for (const candidate of candidates) {
        const user = xp.findUser(message, candidate);
        if (user) return user;

        const normalized = normalizeId(message.platform, candidate);
        if (isUsableId(message.platform, normalized)) {
            const byId = xp.findUser(message, normalized);
            if (byId) return byId;
        }
    }
    return null;
}

function normalizeId(platform, value) {
    const normalized = String(value).trim();
    const mention = normalized.match(/^<@!?(\d+)>$/);
    return platform === "discord" && mention ? mention[1] : normalized;
}

function isUsableId(platform, value) {
    return platform === "whatsapp"
        ? /\d{5,}/.test(String(value))
        : /^\d+$/.test(String(value));
}

module.exports = {
    isAdmin,
    parseXp,
    resolveTarget
};
