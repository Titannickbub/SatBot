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
const repeatedMessageMap = new Map();
const linkActivityMap = new Map();
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

function getRateKey(message, resolved) {
    if (!message) return null;
    const platform = message.platform || "unknown";
    let scopeId = message.chatId || message.guildId || message.serverId || "unknown";

    if (platform === "discord") {
        const channel = message.raw?.channel;
        if (resolved?.level === "server") {
            scopeId = message.raw?.guild?.id || message.guildId || message.serverId || scopeId;
        } else if (resolved?.level === "categoria") {
            scopeId = channel?.parentId || scopeId;
        } else if (channel?.isThread?.()) {
            scopeId = channel.parentId || scopeId;
        }
    } else if (platform === "telegram" && resolved?.level === "chat" && message.threadId) {
        scopeId = `${scopeId}:${message.threadId}`;
    }

    const userId = message.userId || "unknown";
    return `${platform}:${scopeId}:${userId}`;
}

function trackBurst(message, settings, resolved) {
    const key = getRateKey(message, resolved);
    if (!key) return { burst: 0, reset: false };
    const now = Date.now();
    const windowMs = ((settings && settings.windowSeconds) || 12) * 1000;
    const bucket = rateMap.get(key) || [];
    const valid = bucket.filter(ts => now - ts <= windowMs);
    valid.push(now);
    rateMap.set(key, valid);
    return { burst: valid.length };
}

function trackRepeatedMessage(message, settings, resolved) {
    const key = getRateKey(message, resolved);
    const normalizedText = String(message?.text || "").trim().replace(/\s+/g, " ").toLowerCase();
    if (!key || !normalizedText) return { count: 0 };

    const now = Date.now();
    const windowMs = ((settings && settings.windowSeconds) || 12) * 1000;
    const previous = repeatedMessageMap.get(key);
    const count = previous &&
        previous.text === normalizedText &&
        now - previous.timestamp <= windowMs
        ? previous.count + 1
        : 1;

    repeatedMessageMap.set(key, { text: normalizedText, count, timestamp: now });
    return { count };
}

function trackLinkActivity(message, settings, resolved) {
    const key = getRateKey(message, resolved);
    if (!key) return { links: 0, invites: 0 };

    const text = String(message?.text || "");
    const links = text.match(/(?:https?:\/\/|www\.)[^\s<>()]+/gi) || [];
    const invites = text.match(/(?:discord\.gg|discord(?:app)?\.com\/invite|t\.me|wa\.me|chat\.whatsapp\.com)\/?[^\s<>()]*/gi) || [];
    const now = Date.now();
    const windowMs = ((settings && settings.windowSeconds) || 12) * 1000;
    const previous = linkActivityMap.get(key) || [];
    const recent = previous.filter(entry => now - entry.timestamp <= windowMs);

    if (links.length || invites.length) {
        recent.push({ timestamp: now, links: links.length, invites: invites.length });
    }

    linkActivityMap.set(key, recent);
    return {
        links: recent.reduce((total, entry) => total + entry.links, 0),
        invites: recent.reduce((total, entry) => total + entry.invites, 0)
    };
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

        const burst = trackBurst(message, settings, resolved);
        const repeated = trackRepeatedMessage(message, settings, resolved);
        const linkActivity = trackLinkActivity(message, settings, resolved);
        const evaluation = evaluateAntiRaid(message);
        const threshold = Number(settings.maxMessagesPerWindow) || 8;
        const repeatedLimit = Number(settings.repeatedMessageLimit) || 4;
        const linkLimit = Number(settings.linkLimit) || 3;
        const inviteLimit = Number(settings.inviteLimit) || 2;
        const shouldBlock = isBlacklisted ||
            evaluation.shouldDelete ||
            repeated.count >= repeatedLimit ||
            linkActivity.links >= linkLimit ||
            linkActivity.invites >= inviteLimit ||
            burst.burst >= threshold;

        if (!shouldBlock) {
            return true;
        }

        let action = (evaluation.action && evaluation.action !== "none") ? evaluation.action : (settings.action || "mute");
        if (message.platform === "whatsapp" && (action === "mute" || action === "remove")) {
            action = "kick";
        }

        console.log(
            `[ANTIRAID] 🚨 Risco detectado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId}` +
            ` | burst: ${burst.burst}/${threshold}` +
            ` | repetidas: ${repeated.count}/${repeatedLimit}` +
            ` | links: ${linkActivity.links}/${linkLimit}` +
            ` | convites: ${linkActivity.invites}/${inviteLimit}` +
            ` | mídia: ${message.media?.type || "não"}` +
            ` | risk: ${evaluation.risk || 0}` +
            ` | ação: ${action}`
        );

        try {
            const reason = `Anti-raid: risco detectado (${action})`;

            if (message.platform === "telegram") {
                if (action === "ban") {
                    await banMember("telegram", message, reason);
                } else if (action === "kick") {
                    await kickMember("telegram", message, reason);
                } else {
                    await muteMember("telegram", message, 10 * 60 * 1000, reason);
                }
            } else if (message.platform === "discord") {
                if (action === "ban") {
                    await banMember("discord", message, reason);
                } else if (action === "kick") {
                    await kickMember("discord", message, reason);
                } else {
                    await muteMember("discord", message, 10 * 60 * 1000, reason);
                }
            } else if (message.platform === "whatsapp") {
                if (action === "ban") {
                    await banMember("whatsapp", message, reason);
                } else if (action === "kick") {
                    await kickMember("whatsapp", message, reason);
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
                repeated: repeated.count,
                links: linkActivity.links,
                invites: linkActivity.invites,
                risk: evaluation.risk || 0,
                reason,
                text: String(message.text || "").slice(0, 180)
            };
            appendRaidLog(logEntry);
            console.log(`[ANTIRAID] ✅ Bloqueado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | ação: ${action} | motivo: ${reason}`);

            const channel = message.channel || message.raw?.channel || null;
            if (channel && typeof channel.send === "function") {
                try {
                    await channel.send({
                        content: `🚨 Anti-raid ativado no ${message.platform}. Usuário em risco detectado. Ação aplicada: *${action}*.`
                    });
                } catch (err) {
                    console.warn("⚠️[ANTI-RAID] Ação aplicada, mas não foi possível enviar o aviso:", err && err.message ? err.message : err);
                }
            } else if (typeof message.reply === "function") {
                try {
                    await message.reply({
                        text: `🚨 Anti-raid ativado no ${message.platform}. Usuário em risco detectado. Ação aplicada: *${action}*.`
                    });
                } catch (err) {
                    console.warn("⚠️[ANTI-RAID] Ação aplicada, mas não foi possível enviar o aviso:", err && err.message ? err.message : err);
                }
            }

            return false;
        } catch (err) {
            console.error("❌[ANTI-RAID] Erro ao aplicar proteção:", err && err.message ? err.message : err);
            return true;
        }
    }
};
