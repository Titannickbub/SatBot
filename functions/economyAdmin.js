const economy = require("./economy");
const { isOwner } = require("./owners");

function isAdmin(message) {
    return Boolean(message.sender?.isAdmin || message.sender?.isOwner || isOwner(message));
}

function parseAmount(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

    const [whole, cents = ""] = normalized.split(".");
    const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0") || 0);
    return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function resolveTarget(message, targetArgument) {
    const candidates = [
        message.quoted?.userId,
        message.platform === "discord" ? message.raw?.mentions?.users?.first()?.id : null,
        ...(message.mentionedJids || []),
        targetArgument
    ].filter(Boolean);

    for (const candidate of candidates) {
        const account = economy.findAccount(message, candidate);
        if (account) return account;

        const id = normalizeId(message.platform, candidate);
        if (isUsableId(message.platform, id)) {
            return {
                userId: id,
                username: null,
                displayName: null
            };
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
    parseAmount,
    resolveTarget
};
