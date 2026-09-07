const { detectMediaType, resolveAntimediaConfig, ALL_MEDIA_TYPES } = require("../functions/antimediaHelper");
const {
    isUserWhitelisted,
    isUserBlacklisted,
    isRoleWhitelisted,
    isRoleBlacklisted
} = require("../functions/antiHelper");
const { isOwner } = require("../functions/owners");
const { kickMember, banMember } = require("../functions/moderationHelper");
const { addWarn } = require("../functions/warnHelper");

const permWarnCooldown = new Set();

module.exports = {
    name: "antimedia",
    priority: 85,
    runOn: "all",

    async execute(message) {
        if (message.isPrivate) return true;

        const mediaType = detectMediaType(message);
        if (!mediaType) return true;

        const resolved = resolveAntimediaConfig(message);
        if (!resolved || !resolved.config.enabled) {
            return true;
        }

        const {
            action,
            message: customMsg,
            mediaTypes = [],
            userWhitelist = [],
            userBlacklist = [],
            roleWhitelist = [],
            roleBlacklist = []
        } = resolved.config;

        const isBlacklisted = isUserBlacklisted(userBlacklist, message.userId) || isRoleBlacklisted(roleBlacklist, message);
        const isWhitelisted = isUserWhitelisted(userWhitelist, message.userId) || isRoleWhitelisted(roleWhitelist, message);

        // Lista negra é punida mesmo se o tipo específico não estiver filtrado (se for mídia enviada)
        const blockedTypes = mediaTypes.length ? mediaTypes : ALL_MEDIA_TYPES;
        if (!isBlacklisted && !blockedTypes.includes(mediaType)) {
            return true;
        }

        if (!isBlacklisted && isWhitelisted) {
            console.log(`[ANTIMEDIA] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: usuário/cargo na lista branca`);
            return true;
        }

        if (
            !isBlacklisted && (
                message.sender?.isAdmin ||
                message.sender?.isOwner ||
                message.sender?.canManageMessages ||
                isOwner(message)
            )
        ) {
            console.log(`[ANTIMEDIA] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: usuário imune`);
            return true;
        }

        const platform = message.platform;
        const adapter = (message.platforms || []).find(p => p.name === platform);

        if (adapter?.checkBotPermission) {
            const botOk = await adapter.checkBotPermission(message.chatId, action);
            if (!botOk) {
                const cooldownKey = `${message.chatId}:${action}:antimedia`;
                if (!permWarnCooldown.has(cooldownKey)) {
                    permWarnCooldown.add(cooldownKey);
                    setTimeout(() => permWarnCooldown.delete(cooldownKey), 60_000);
                    await message.reply({
                        text: `⚠️ Antimedia ativo (ação: *${action}*), mas o bot não tem permissão para executar essa ação aqui.`
                    });
                }
                return true;
            }
        }

        try {
            const notifyText = customMsg || _defaultMsg(platform, action, mediaType);
            await message.reply({ text: notifyText }).catch(() => {});
            await message.delete(message.messageId, message.userId);

            if (action === "warn") {
                const result = await addWarn(message, message.userId, "Antimedia");
                if (result && result.punished) {
                    const punMsg = result.action === "ban" ? "banido" : "removido";
                    await message.reply({ text: `🚫 Limite de advertências atingido (${result.maxWarns}/${result.maxWarns}). Usuário ${punMsg}!` }).catch(() => {});
                } else if (result) {
                    await message.reply({ text: `⚠️ Advertência registrada (${result.currentWarns}/${result.maxWarns}).` }).catch(() => {});
                }
            } else if (action === "kick") {
                await kickMember(platform, message);
            } else if (action === "ban") {
                await banMember(platform, message, "Antimedia");
            }

            console.log(`[ANTIMEDIA] ✅ Ação executada | ${platform} | user: ${message.userId} | chat: ${message.chatId} | mídia: ${mediaType} | ação: ${action}`);
        } catch (err) {
            console.error("[ANTIMEDIA] Erro ao aplicar punição:", err);
        }

        return false;
    }
};

function _defaultMsg(platform, action, mediaType) {
    const labels = {
        warn: `⚠️ Mídia ${mediaType} não é permitida aqui.`,
        kick: `🚫 Você foi removido por enviar mídia ${mediaType}.`,
        ban: `🔨 Você foi banido por enviar mídia ${mediaType}.`
    };
    return labels[action] || `⚠️ Mídia ${mediaType} proibida.`;
}
