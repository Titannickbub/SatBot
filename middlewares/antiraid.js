const fs = require("fs");
const path = require("path");
const { shouldApplyAntiRaid, evaluateAntiRaid, resolveAntiRaidConfig } = require("../functions/antiraidHelper");
const {
    isUserWhitelisted,
    isUserBlacklisted,
    isRoleWhitelisted,
    isRoleBlacklisted
} = require("../functions/antiHelper");
const { muteMember, banMember, kickMember } = require("../functions/moderationHelper");

const rateMap = new Map();
const raidLogFile = path.join(__dirname, "..", "settings", "antiraid.log");

function appendRaidLog(entry) {
    try {
        const dir = path.dirname(raidLogFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(raidLogFile, `${new Date().toISOString()} ${JSON.stringify(entry)}\n`, "utf8");
    } catch (err) {
        console.error("❌[ANTI-RAID] Falha ao gravar log:", err && err.message ? err.message : err);
    }
}

function getRateKey(message) {
    if (!message) return null;
    const platform = message.platform || "unknown";
    const chatId = message.chatId || message.guildId || message.serverId || "unknown";
    const userId = message.userId || "unknown";
    return `${platform}:${chatId}:${userId}`;
}

function trackBurst(message, settings) {
    const key = getRateKey(message);
    if (!key) return { burst: 0, reset: false };
    const now = Date.now();
    const windowMs = ((settings && settings.windowSeconds) || 12) * 1000;
    const bucket = rateMap.get(key) || [];
    const valid = bucket.filter(ts => now - ts <= windowMs);
    valid.push(now);
    rateMap.set(key, valid);
    return { burst: valid.length };
}

module.exports = {
    name: "antiraid",
    priority: 92,
    runOn: "all",

    async execute(message) {
        if (!message || message.isPrivate) return true;

        const sender = message.sender || {};
        const isImmune = sender.isAdmin || sender.isOwner || sender.canManageMessages;

        if (!shouldApplyAntiRaid(message)) {
            return true;
        }

        if (isImmune) {
            return true;
        }

        const resolved = resolveAntiRaidConfig(message) || { config: {} };
        const settings = resolved.config || {};
        const {
            userWhitelist = [],
            userBlacklist = [],
            roleWhitelist = [],
            roleBlacklist = []
        } = settings;

        // ── 1. Verificação de Lista Branca (Usuário ou Cargo) ───────────
        if (isUserWhitelisted(userWhitelist, message.userId)) {
            console.log(`[ANTIRAID] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: usuário na lista branca`);
            return true;
        }
        if (isRoleWhitelisted(roleWhitelist, message)) {
            console.log(`[ANTIRAID] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: cargo na lista branca`);
            return true;
        }

        const isBlacklisted = isUserBlacklisted(userBlacklist, message.userId) || isRoleBlacklisted(roleBlacklist, message);

        const burst = trackBurst(message, settings);
        const evaluation = evaluateAntiRaid(message);
        const threshold = Number(settings.maxMessagesPerWindow) || 8;
        const shouldBlock = isBlacklisted || evaluation.shouldDelete || burst.burst >= threshold;

        if (!shouldBlock) {
            return true;
        }

        console.log(
            `[ANTIRAID] 🚨 Risco detectado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId}` +
            ` | burst: ${burst.burst}/${threshold}` +
            ` | risk: ${evaluation.risk || 0}` +
            ` | ação: ${evaluation.action || settings.action || "mute"}`
        );

        try {
            const action = (evaluation.action && evaluation.action !== "none") ? evaluation.action : (settings.action || "mute");
            const reason = `Anti-raid: risco detectado (${action})`;

            if (message.platform === "telegram") {
                if (action === "ban") {
                    await banMember("telegram", message, reason).catch(() => {});
                } else if (action === "kick") {
                    await kickMember("telegram", message).catch(() => {});
                } else {
                    await muteMember("telegram", message, 10 * 60 * 1000, reason).catch(() => {});
                }
            } else if (message.platform === "discord") {
                if (action === "ban") {
                    await banMember("discord", message, reason).catch(() => {});
                } else if (action === "kick") {
                    await kickMember("discord", message).catch(() => {});
                } else {
                    await muteMember("discord", message, 10 * 60 * 1000, reason).catch(() => {});
                }
            } else if (message.platform === "whatsapp") {
                if (action === "ban") {
                    await banMember("whatsapp", message, reason).catch(() => {});
                } else if (action === "kick") {
                    await kickMember("whatsapp", message, reason).catch(() => {});
                }
            }

            if (typeof message.delete === "function" && message.messageId) {
                await message.delete(message.messageId, message.userId);
            }

            const logEntry = {
                platform: message.platform,
                chatId: message.chatId,
                userId: message.userId,
                action,
                burst: burst.burst,
                risk: evaluation.risk || 0,
                reason,
                text: String(message.text || "").slice(0, 180)
            };
            appendRaidLog(logEntry);
            console.log(`[ANTIRAID] ✅ Bloqueado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | ação: ${action} | motivo: ${reason}`);

            const channel = message.channel || message.raw?.channel || null;
            if (channel && typeof channel.send === "function") {
                await channel.send({
                    content: `🚨 Anti-raid ativado no ${message.platform}. Usuário em risco detectado. Ação aplicada: *${action}*.`
                }).catch(() => {});
            } else if (typeof message.reply === "function") {
                await message.reply({
                    text: `🚨 Anti-raid ativado no ${message.platform}. Usuário em risco detectado. Ação aplicada: *${action}*.`
                }).catch(() => {});
            }

            return false;
        } catch (err) {
            console.error("❌[ANTI-RAID] Erro ao aplicar proteção:", err && err.message ? err.message : err);
            return true;
        }
    }
};
