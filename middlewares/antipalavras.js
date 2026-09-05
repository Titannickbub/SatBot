const { containsForbiddenWord, resolveAntipalavrasConfig } = require("../functions/antipalavrasHelper");
const { isOwner } = require("../functions/owners");
const { kickMember, banMember } = require("../functions/moderationHelper");
const { addWarn } = require("../functions/warnHelper");

const permWarnCooldown = new Set();

module.exports = {
    name: "antipalavras",
    priority: 85,
    runOn: "all",

    async execute(message) {
        if (message.isPrivate) return true;

        const text = message.text || "";
        if (!text) return true;

        const resolved = resolveAntipalavrasConfig(message);
        if (!resolved || !resolved.config.enabled) {
            return true;
        }

        const { action, message: customMsg, words = [], userWhitelist = [] } = resolved.config;
        if (!containsForbiddenWord(text, words)) {
            return true;
        }

        // ── Lista branca de usuários ────────────────────────────────
        if (Array.isArray(userWhitelist) && userWhitelist.includes(String(message.userId))) {
            console.log(`[ANTIPALAVRAS] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: usuário na lista branca`);
            return true;
        }

        if (
            message.sender?.isAdmin ||
            message.sender?.isOwner ||
            message.sender?.canManageMessages ||
            isOwner(message)
        ) {
            console.log(`[ANTIPALAVRAS] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: usuário imune`);
            return true;
        }

        const platform = message.platform;
        const adapter = (message.platforms || []).find(p => p.name === platform);

        if (adapter?.checkBotPermission) {
            const botOk = await adapter.checkBotPermission(message.chatId, action);
            if (!botOk) {
                const cooldownKey = `${message.chatId}:${action}:antipalavras`;
                if (!permWarnCooldown.has(cooldownKey)) {
                    permWarnCooldown.add(cooldownKey);
                    setTimeout(() => permWarnCooldown.delete(cooldownKey), 60_000);
                    await message.reply({
                        text: `⚠️ Antipalavras ativo (ação: *${action}*), mas o bot não tem permissão para executar essa ação aqui.`
                    });
                }
                return true;
            }
        }

        try {
            const notifyText = customMsg || _defaultMsg(platform, action);
            await message.reply({ text: notifyText }).catch(() => {});
            await message.delete(message.messageId, message.userId);

            if (action === "warn") {
                const result = await addWarn(message, message.userId, "Antipalavras");
                if (result && result.punished) {
                    const punMsg = result.action === "ban" ? "banido" : "removido";
                    await message.reply({ text: `🚫 Limite de advertências atingido (${result.maxWarns}/${result.maxWarns}). Usuário ${punMsg}!` }).catch(() => {});
                } else if (result) {
                    await message.reply({ text: `⚠️ Advertência registrada (${result.currentWarns}/${result.maxWarns}).` }).catch(() => {});
                }
            } else if (action === "kick") {
                await kickMember(platform, message);
            } else if (action === "ban") {
                await banMember(platform, message, "Antipalavras");
            }

            console.log(`[ANTIPALAVRAS] ✅ Ação executada | ${platform} | user: ${message.userId} | chat: ${message.chatId} | ação: ${action}`);
        } catch (err) {
            console.error("[ANTIPALAVRAS] Erro ao aplicar punição:", err);
        }

        return false;
    }
};

function _defaultMsg(platform, action) {
    const labels = {
        warn: "⚠️ Palavras proibidas não são permitidas aqui.",
        kick: "🚫 Você foi removido por usar palavras proibidas.",
        ban: "🔨 Você foi banido por usar palavras proibidas."
    };
    return labels[action] || "⚠️ Conteúdo proibido detectado.";
}
