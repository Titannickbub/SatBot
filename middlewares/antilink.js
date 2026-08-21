const { hasLink, resolveAntilinkConfig } = require("../functions/antilinkHelper");
const { isOwner } = require("../functions/owners");
const { kickMember, banMember } = require("../functions/moderationHelper");
const { addWarn } = require("../functions/warnHelper");

// Conjunto para evitar mensagem de erro de permissão repetitiva
const permWarnCooldown = new Set();

module.exports = {
    name: "antilink",
    priority: 90,   // executa antes dos comandos comuns
    runOn: "all",

    async execute(message) {
        // Apenas grupos/canais
        if (message.isPrivate) return true;

        const text = message.text || "";
        const resolved = resolveAntilinkConfig(message);

        // ── Log de diagnóstico (sempre, pré-qualquer filtro) ──────────
        if (hasLink(text)) {
            const actionLabel = resolved?.config?.enabled ? resolved.config.action : null;
            const immune = (message.sender?.isAdmin || message.sender?.isOwner || message.sender?.canManageMessages);
            console.log(
                `[ANTILINK] 🔗 Link detectado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId}` +
                (immune
                    ? ` | ignorado (usuário imune: admin/dono)`
                    : actionLabel
                        ? ` | ação configurada: ${actionLabel}`
                        : ` | ignorado (sem config ativa ou antilink desativado)`)
            );
        }

        if (!hasLink(text)) {
            return true;
        }

        // Imunidade: admins, donos e superusuários
        if (
            message.sender?.isAdmin ||
            message.sender?.isOwner ||
            message.sender?.canManageMessages ||
            isOwner(message)
        ) {
            console.log(`[ANTILINK] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: usuário imune`);
            return true;
        }

        // Resolve qual config de antilink está ativa (respeitando herança)
        if (!resolved || !resolved.config.enabled) {
            console.log(`[ANTILINK] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: sem config ativa`);
            return true;
        }

        // ── Lista branca de usuários ────────────────────────────────
        const { action, message: customMsg, ignoreSameGroup, ignoreMedia, whitelist, userWhitelist } = resolved.config;
        if (Array.isArray(userWhitelist) && userWhitelist.includes(String(message.userId))) {
            console.log(`[ANTILINK] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: usuário na lista branca`);
            return true;
        }

        // ── 1. Verificações de Lista Branca (Whitelist) ───────────────
        let isWhitelisted = false;

        // a) Ignorar mídias (downloads)
        if (ignoreMedia) {
            const MEDIA_DOMAINS = [
                "youtube.com", "youtu.be",
                "tiktok.com", "vm.tiktok.com",
                "instagram.com",
                "twitter.com", "x.com",
                "facebook.com", "fb.watch", "fb.com",
                "kwai.com", "kw.ai",
                "pinterest.com", "pin.it",
                "spotify.com"
            ];
            if (MEDIA_DOMAINS.some(domain => text.includes(domain))) {
                isWhitelisted = true;
                console.log(`[ANTILINK] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: link de mídia permitido`);
            }
        }

        // b) Lista Branca específica (whitelist)
        if (!isWhitelisted && Array.isArray(whitelist) && whitelist.length > 0) {
            if (whitelist.some(domain => text.includes(domain))) {
                isWhitelisted = true;
                console.log(`[ANTILINK] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: link na lista branca`);
            }
        }

        // c) Ignorar o próprio grupo/servidor
        if (!isWhitelisted && ignoreSameGroup) {
            try {
                if (message.platform === "whatsapp" && global.whatsappSock && message.chatId.endsWith("@g.us")) {
                    const code = await global.whatsappSock.groupInviteCode(message.chatId).catch(() => null);
                    if (code && text.includes(code)) {
                        isWhitelisted = true;
                    }
                } else if (message.platform === "discord" && message.raw?.guild) {
                    const invites = await message.raw.guild.invites.fetch().catch(() => new Map());
                    const inviteCodes = Array.from(invites.values()).map(inv => inv.code);
                    if (inviteCodes.some(code => text.includes(code))) {
                        isWhitelisted = true;
                    }
                }
                
                if (isWhitelisted) {
                    console.log(`[ANTILINK] 🚫 Ignorado | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | motivo: link do próprio grupo`);
                }
            } catch (err) {
                console.error("[ANTILINK] Erro ao verificar ignoreSameGroup:", err);
            }
        }

        if (isWhitelisted) return true; // Deixa passar a mensagem
        const platform = message.platform;

        // Encontra o adapter da plataforma
        const adapter = (message.platforms || []).find(p => p.name === platform);

        // ── Verifica permissão do BOT ─────────────────────────────
        if (adapter?.checkBotPermission) {
            const botOk = await adapter.checkBotPermission(message.chatId, action);
            if (!botOk) {
                const cooldownKey = `${message.chatId}:${action}`;
                if (!permWarnCooldown.has(cooldownKey)) {
                    permWarnCooldown.add(cooldownKey);
                    setTimeout(() => permWarnCooldown.delete(cooldownKey), 60_000);
                    await message.reply({
                        text: `⚠️ Antilink ativo (ação: *${action}*), mas o bot não tem permissão para executar essa ação aqui. Conceda as permissões necessárias de administrador.`
                    });
                }
                return true; // não bloqueia — só avisa
            }
        }

        // ── Executa a punição ─────────────────────────────────────
        try {
            const notifyText = customMsg || _defaultMsg(platform, action);
            const shouldNotify = action !== "delete" || Boolean(customMsg);

            if (shouldNotify) {
                await message.reply({ text: notifyText }).catch(() => {});
            }

            // 1. Sempre deleta a mensagem com o link
            await message.delete(message.messageId, message.userId).catch(() => {});

            if (action === "warn") {
                const result = await addWarn(message, message.userId, "Antilink");
                if (result && result.punished) {
                    const punMsg = result.action === "ban" ? "banido" : "removido";
                    await message.reply({ text: `🚫 Limite de advertências atingido (${result.maxWarns}/${result.maxWarns}). Usuário ${punMsg}!` }).catch(() => {});
                } else if (result) {
                    await message.reply({ text: `⚠️ Advertência registrada (${result.currentWarns}/${result.maxWarns}).` }).catch(() => {});
                }
            } else if (action === "kick") {
                await kickMember(platform, message);
            } else if (action === "ban") {
                await banMember(platform, message, "Antilink");
            }

            console.log(`[ANTILINK] ✅ Ação executada | ${platform} | user: ${message.userId} | chat: ${message.chatId} | ação: ${action}`);
            // action === "delete": já tratada acima, com notificação apenas se customMsg estiver presente
        } catch (err) {
            console.error("[ANTILINK] Erro ao aplicar punição:", err);
        }

        // Bloqueia a mensagem de chegar ao processador de comandos
        return false;
    }
};

// ─────────────────────────────────────────────────────────────
//  HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────

function _defaultMsg(platform, action) {
    const labels = {
        warn: "⛔ Links não são permitidos aqui.",
        kick: "🚫 Você foi removido por enviar um link.",
        ban:  "🔨 Você foi banido por enviar um link."
    };
    return labels[action] || "⛔ Link removido.";
}
