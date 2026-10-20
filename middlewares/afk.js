const afk = require("../functions/afkHelper");
const centralAccounts = require("../functions/centralAccounts");
const { sameUserId } = require("../functions/moderationHelper");

module.exports = {
    name: "afk",
    description: "Notifica sobre usuários em AFK e desativa o modo quando voltam a falar.",
    priority: 90,
    runOn: "all",

    async execute(message) {
        if (!message?.platform || !message.userId || !message.chatId) return true;
        const store = message.functions?.centralAccounts || global.centralAccounts || centralAccounts;
        const centralId = message.centralAccountId;

        if (centralId && !isAfkCommand(message)) {
            const cleared = [];
            const globalRecord = afk.removeGlobal(centralId);
            if (globalRecord) cleared.push(globalRecord);

            if (isGroupMessage(message)) {
                const groupRecord = afk.removeGroup(message.platform, message.chatId, centralId);
                if (groupRecord) cleared.push(groupRecord);
            }

            if (cleared.length) {
                const isGlobal = cleared.some(record => record.scope === "global");
                const scope = isGlobal ? "global" : "deste grupo";
                await message.reply({ text: `✅ Seu modo AFK ${scope} foi desativado porque você voltou a falar.` });
            }
        }

        const targets = new Set();
        for (const identifier of [
            ...(Array.isArray(message.mentionedJids) ? message.mentionedJids : []),
            message.quoted?.userId
        ]) {
            if (!identifier) continue;
            const targetAccount = findCentralAccount(store, message.platform, identifier);
            if (targetAccount?.id) targets.add(String(targetAccount.id));
        }

        const notices = [];
        for (const targetId of targets) {
            const globalRecord = afk.getGlobal(targetId);
            if (globalRecord) {
                notices.push(formatNotice(globalRecord, "global"));
            }

            if (isGroupMessage(message)) {
                const groupRecord = afk.getGroup(message.platform, message.chatId, targetId);
                if (groupRecord) notices.push(formatNotice(groupRecord, "deste grupo"));
            }
        }

        if (notices.length) {
            await message.reply({ text: [...new Set(notices)].join("\n") });
        }
        return true;
    }
};

function isAfkCommand(message) {
    const prefix = String(message.prefix || "!");
    const text = String(message.text || "").trimStart();
    const firstWord = text.split(/\s+/, 1)[0].toLocaleLowerCase();
    return firstWord === `${prefix}afk`.toLocaleLowerCase();
}

function isGroupMessage(message) {
    if (message.platform === "whatsapp") return String(message.chatId).endsWith("@g.us");
    return ["group", "supergroup"].includes(message.chatType) ||
        (message.platform === "discord" && !message.isPrivate);
}

function findCentralAccount(store, platform, identifier) {
    const normalized = String(identifier).trim();
    const direct = store.findByPlatform?.(platform, normalized);
    if (direct) return direct;

    const username = normalized.replace(/^@/, "").toLocaleLowerCase();
    return (store.getAllCentralAccounts?.() || []).find(account =>
        (account.platformAccounts || []).some(platformAccount =>
            platformAccount.platform === platform &&
            (sameUserId(platformAccount.platformId, normalized) ||
                String(platformAccount.username || "").replace(/^@/, "").toLocaleLowerCase() === username)
        )
    ) || null;
}

function formatNotice(record, scope) {
    const name = record.name || "Este usuário";
    return `💤 ${name} está AFK (${scope}): ${record.reason}`;
}
