const { resolveBlockcmdConfig, isCommandBlocked } = require("../functions/blockcmdHelper");
const { isOwner } = require("../functions/owners");
const { getGlobalBlockcmd } = require("../functions/config");

module.exports = {
    name: "blockcmd",
    priority: 95, // Executa antes da execução de comandos
    runOn: "command",

    async execute(message) {
        const isUserOwner = isOwner(message);

        // ── 1. VERIFICAÇÃO DE BLOQUEIO GLOBAL (blockcmd_su) ──────────
        const globalCfg = getGlobalBlockcmd();
        if (globalCfg && globalCfg.enabled) {
            const globalResolved = { config: globalCfg };
            const isGloballyBlocked = isCommandBlocked(message, globalResolved);

            if (isGloballyBlocked) {
                // Donos/Super Usuários são IMUNES ao bloqueio global
                if (isUserOwner) {
                    return true;
                }

                const cmdName = message.command || "comando";
                const action = globalCfg.action || "reply";

                console.log(`[BLOCKCMD_SU] 🚫 Comando bloqueado globalmente | ${message.platform} | user: ${message.userId} | cmd: ${cmdName} | action: ${action}`);

                if (action === "ignore") {
                    return false;
                }

                let customMsg = globalCfg.message || "⚠️ O comando `{prefix}{cmd}` foi desativado globalmente pelo administrador do bot.";
                customMsg = customMsg
                    .replaceAll("{cmd}", cmdName)
                    .replaceAll("{user}", message.displayName || message.username || `@${message.userId}`)
                    .replaceAll("{prefix}", message.prefix || "!");

                if (action === "delete") {
                    if (typeof message.delete === "function") {
                        await message.delete(message.messageId).catch(() => {});
                    }
                }

                await message.reply({ text: customMsg }).catch(() => {});
                return false;
            }
        }

        // ── 2. VERIFICAÇÃO DE BLOQUEIO LOCAL POR NÍVEIS (blockcmd) ────
        // Ignora em conversas privadas (bloqueio local exclusivo para grupos/servidores)
        if (message.isPrivate) return true;

        // Imunidade local para Administradores e Donos do bot
        if (
            message.sender?.isAdmin ||
            message.sender?.isOwner ||
            message.sender?.canManageMessages ||
            isUserOwner
        ) {
            return true;
        }

        const resolved = resolveBlockcmdConfig(message);
        if (!resolved || !resolved.config?.enabled) {
            return true;
        }

        const blocked = isCommandBlocked(message, resolved);
        if (!blocked) {
            return true;
        }

        const cmdName = message.command || "comando";
        const action = resolved.config.action || "reply";

        console.log(`[BLOCKCMD] 🚫 Comando bloqueado localmente | ${message.platform} | user: ${message.userId} | chat: ${message.chatId} | cmd: ${cmdName} | action: ${action}`);

        if (action === "ignore") {
            return false;
        }

        let customMsg = resolved.config.message || "⚠️ O comando `{prefix}{cmd}` está desativado neste chat.";
        customMsg = customMsg
            .replaceAll("{cmd}", cmdName)
            .replaceAll("{user}", message.displayName || message.username || `@${message.userId}`)
            .replaceAll("{prefix}", message.prefix || "!");

        if (action === "delete") {
            if (typeof message.delete === "function") {
                await message.delete(message.messageId).catch(() => {});
            }
        }

        await message.reply({ text: customMsg }).catch(() => {});
        return false;
    }
};
