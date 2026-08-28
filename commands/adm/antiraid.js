const { getSetAntiRaid, resolveAntiRaidConfig } = require("../../functions/antiraidHelper");
const { isOwner } = require("../../functions/owners");

function normalizeAction(value) {
    if (!value) return null;
    const v = String(value).toLowerCase().trim();
    if (["mute", "timeout", "mute-temporario"].includes(v)) return "mute";
    if (["ban", "bano"].includes(v)) return "ban";
    if (["kick", "expulsar"].includes(v)) return "kick";
    return null;
}

function normalizeToggle(value) {
    if (!value) return null;
    const v = String(value).toLowerCase().trim();
    if (["on", "enable", "enabled", "true", "1"].includes(v)) return true;
    if (["off", "disable", "disabled", "false", "0"].includes(v)) return false;
    return null;
}

module.exports = {
    name: "antiraid",
    aliases: ["raidguard", "anti_raid", "guardraid"],
    category: "adm",
    description: "Protege o grupo ou servidor contra flood, spam, mensagens repetidas, links, menções e webhooks suspeitos. O anti-raid é aplicado apenas no contexto atual do chat/servidor e respeita as regras locais do ambiente. Ele permite ativar/desativar a proteção, mudar a ação aplicada e ajustar o limite de mensagens em janela de tempo.",
    usage: "{prefix}antiraid | {prefix}antiraid status | {prefix}antiraid on | {prefix}antiraid off | {prefix}antiraid action mute|kick|ban | {prefix}antiraid flood 8 12",
    examples: [
        "{prefix}antiraid",
        "{prefix}antiraid status",
        "{prefix}antiraid on",
        "{prefix}antiraid off",
        "{prefix}antiraid action mute",
        "{prefix}antiraid action ban",
        "{prefix}antiraid flood 8 12"
    ],

    async execute(message) {
        if (!message || message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores." });
        }

        const sender = message.sender || {};
        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : (sender.isAdmin || sender.isOwner || sender.canManageMessages || isOwner(message));

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores ou super usuários podem usar este comando." });
        }

        const args = Array.isArray(message.args) ? message.args : [];
        const resolved = resolveAntiRaidConfig(message);
        const currentCfg = resolved?.config || { enabled: false, action: "mute", maxMessagesPerWindow: 8, windowSeconds: 12 };

        const first = (args[0] || "").toLowerCase();
        if (!args.length || first === "help" || first === "ajuda") {
            return message.reply({ text: _help(message) });
        }

        if (first === "status") {
            const lines = [
                "🛡️ *Status do Anti-Raid*",
                "",
                `• Ativo: ${currentCfg.enabled ? "✅ Sim" : "❌ Não"}`,
                `• Ação: ${currentCfg.action || "mute"}`,
                `• Limite: ${currentCfg.maxMessagesPerWindow || 8} msgs em ${currentCfg.windowSeconds || 12}s`,
                `• Nível: ${resolved?.level || "nenhum"}`,
                "",
                "Uso:",
                `• ${message.prefix}antiraid on`,
                `• ${message.prefix}antiraid off`,
                `• ${message.prefix}antiraid action mute`,
                `• ${message.prefix}antiraid action ban`
            ];
            return message.reply({ text: lines.join("\n") });
        }

        if (args[0].toLowerCase() === "on" || args[0].toLowerCase() === "off") {
            const enabled = args[0].toLowerCase() === "on";
            const level = message.platform === "discord" ? "server" : message.platform === "whatsapp" ? "chat" : "server";
            getSetAntiRaid(message, level, {
                enabled,
                action: currentCfg.action || "mute",
                maxMessagesPerWindow: currentCfg.maxMessagesPerWindow || 8,
                windowSeconds: currentCfg.windowSeconds || 12,
                repeatedMessageLimit: currentCfg.repeatedMessageLimit || 4,
                inviteLimit: currentCfg.inviteLimit || 2,
                linkLimit: currentCfg.linkLimit || 3,
                mentionLimit: currentCfg.mentionLimit || 6,
                webhookLimit: currentCfg.webhookLimit || 0,
                groupId: currentCfg.groupId || null,
                applyToTopics: currentCfg.applyToTopics !== false,
                serverOnly: currentCfg.serverOnly !== false,
                communityBypass: currentCfg.communityBypass !== false,
                groupOnly: currentCfg.groupOnly !== false
            });
            return message.reply({ text: `✅ Anti-raid ${enabled ? "ativado" : "desativado"} neste ${message.platform === "discord" ? "servidor" : "grupo"}.` });
        }

        if (args[0].toLowerCase() === "action") {
            const action = normalizeAction(args[1]);
            if (!action) {
                return message.reply({ text: "❌ Ação inválida. Use: mute, timeout, kick ou ban." });
            }
            const level = message.platform === "discord" ? "server" : message.platform === "whatsapp" ? "chat" : "server";
            getSetAntiRaid(message, level, {
                enabled: currentCfg.enabled === true,
                action,
                maxMessagesPerWindow: currentCfg.maxMessagesPerWindow || 8,
                windowSeconds: currentCfg.windowSeconds || 12,
                repeatedMessageLimit: currentCfg.repeatedMessageLimit || 4,
                inviteLimit: currentCfg.inviteLimit || 2,
                linkLimit: currentCfg.linkLimit || 3,
                mentionLimit: currentCfg.mentionLimit || 6,
                webhookLimit: currentCfg.webhookLimit || 0,
                groupId: currentCfg.groupId || null,
                applyToTopics: currentCfg.applyToTopics !== false,
                serverOnly: currentCfg.serverOnly !== false,
                communityBypass: currentCfg.communityBypass !== false,
                groupOnly: currentCfg.groupOnly !== false
            });
            return message.reply({ text: `✅ Ação do anti-raid atualizada para: *${action}*.` });
        }

        if (args[0].toLowerCase() === "flood") {
            const limit = Number(args[1]);
            const seconds = Number(args[2]);
            if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(seconds) || seconds <= 0) {
                return message.reply({ text: "❌ Uso correto: `!antiraid flood 8 12` (8 msgs em 12 segundos)." });
            }
            const level = message.platform === "discord" ? "server" : message.platform === "whatsapp" ? "chat" : "server";
            getSetAntiRaid(message, level, {
                enabled: currentCfg.enabled === true,
                action: currentCfg.action || "mute",
                maxMessagesPerWindow: limit,
                windowSeconds: seconds,
                repeatedMessageLimit: currentCfg.repeatedMessageLimit || 4,
                inviteLimit: currentCfg.inviteLimit || 2,
                linkLimit: currentCfg.linkLimit || 3,
                mentionLimit: currentCfg.mentionLimit || 6,
                webhookLimit: currentCfg.webhookLimit || 0,
                groupId: currentCfg.groupId || null,
                applyToTopics: currentCfg.applyToTopics !== false,
                serverOnly: currentCfg.serverOnly !== false,
                communityBypass: currentCfg.communityBypass !== false,
                groupOnly: currentCfg.groupOnly !== false
            });
            return message.reply({ text: `✅ Flood do anti-raid ajustado para *${limit} mensagens em ${seconds} segundos*.` });
        }

        const toggle = normalizeToggle(args[0]);
        if (toggle !== null) {
            const level = message.platform === "discord" ? "server" : message.platform === "whatsapp" ? "chat" : "server";
            getSetAntiRaid(message, level, {
                enabled: toggle,
                action: currentCfg.action || "mute",
                maxMessagesPerWindow: currentCfg.maxMessagesPerWindow || 8,
                windowSeconds: currentCfg.windowSeconds || 12,
                repeatedMessageLimit: currentCfg.repeatedMessageLimit || 4,
                inviteLimit: currentCfg.inviteLimit || 2,
                linkLimit: currentCfg.linkLimit || 3,
                mentionLimit: currentCfg.mentionLimit || 6,
                webhookLimit: currentCfg.webhookLimit || 0,
                groupId: currentCfg.groupId || null,
                applyToTopics: currentCfg.applyToTopics !== false,
                serverOnly: currentCfg.serverOnly !== false,
                communityBypass: currentCfg.communityBypass !== false,
                groupOnly: currentCfg.groupOnly !== false
            });
            return message.reply({ text: `✅ Anti-raid ${toggle ? "ativado" : "desativado"} neste contexto.` });
        }

        return message.reply({ text: `❌ Comando inválido. Use: ${message.prefix}antiraid` });
    }
};

// ─────────────────────────────────────────────────────────────
// HELP: versão estilo Welcome
// ─────────────────────────────────────────────────────────────
function _help(message) {
    const p = message.prefix;
    const plat = message.platform;

    let header = '🛡️ *ANTI-RAID — AJUDA*';
    if (plat === 'discord') header = '🎮 *ANTI-RAID (Discord) — AJUDA*';
    else if (plat === 'whatsapp') header = '📱 *ANTI-RAID (WhatsApp) — AJUDA*';
    else if (plat === 'telegram') header = '✈️ *ANTI-RAID (Telegram) — AJUDA*';

    const actions = ['mute', 'kick', 'ban'].map(a => `• \`${a}\``).join(' — ');

    const lines = [];
    lines.push(header);
    lines.push('');
    lines.push('Protege seu grupo/servidor contra ataques automatizados e comportamento malicioso (flood, spam, links, menções e webhooks suspeitos).');
    lines.push('');
    lines.push('📋 COMANDOS DISPONÍVEIS:');
    lines.push('  `' + p + 'antiraid status`');
    lines.push('    ↳ Exibe o estado atual e limites configurados.');
    lines.push('');
    lines.push('  `' + p + 'antiraid on` | `' + p + 'antiraid off`');
    lines.push('    ↳ Ativa ou desativa a proteção no nível atual.');
    lines.push('');
    lines.push('  `' + p + 'antiraid action <mute|kick|ban>`');
    lines.push('    ↳ Define a ação tomada contra contas que violam limites. Ações disponíveis: ' + actions + '.');
    lines.push('');
    lines.push('  `' + p + 'antiraid flood <limite> <segundos>`');
    lines.push('    ↳ Ajusta o limite de mensagens (ex: `'+p+'antiraid flood 8 12` = 8 mensagens em 12s).');
    lines.push('');
    lines.push('  Também é possível passar `on|off|status|action|flood` diretamente como argumentos.');
    lines.push('');
    lines.push('⚙️ DICAS E REGRAS:');
    lines.push('  • No Discord, aplique por servidor para proteger todos os canais (server scope).');
    lines.push('  • No WhatsApp, o anti-raid funciona em grupos (chat scope).');
    lines.push('  • Ajuste limites com cuidado para não afetar participantes legítimos.');
    lines.push('');
    lines.push('📌 EXEMPLOS:');
    lines.push('  ' + p + 'antiraid on');
    lines.push('  ' + p + 'antiraid action mute');
    lines.push('  ' + p + 'antiraid flood 10 15');

    return lines.join('\n');
}
