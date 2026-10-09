const { getSetAntiRaid, resolveAntiRaidConfig } = require("../../../functions/antiraidHelper");
const {
    resolveTargetUser,
    resolveTargetRole,
    formatRoleMention,
    formatUserMention,
    sameUserId
} = require("../../../functions/antiHelper");
const { isOwner } = require("../../../functions/owners");

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
    category: "adm/segurança",
    description: `🛡️ Configura a proteção anti-raid contra flood de mensagens, repetição de conteúdo, excesso de links/convites e riscos de menções/webhooks neste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.

🌐 Escopo por plataforma:
• Discord: no nível servidor, soma mensagens do mesmo membro em todos os canais e threads.
• Telegram: conta no grupo; mensagens nos tópicos entram na mesma proteção.
• WhatsApp: conta mensagens no grupo; ações mute/remove usam remoção do membro.
• Imagens e anexos contam como mensagens para o limite de flood. Links e convites têm contadores próprios.
• Administradores, donos e usuários/cargos na lista branca são ignorados.

✅ 1. Ative ou desative o anti-raid:
{prefix}antiraid on
{prefix}antiraid off

⚙️ 2. Escolha o que fazer quando um membro violar os limites:
{prefix}antiraid action <mute|kick|ban>
{prefix}antiraid action mute

mute silencia o membro temporariamente; kick expulsa; ban bane. As ações kick e ban exigem que o bot tenha permissão para moderar membros.

🔢 3. Configure os limites de flood:
{prefix}antiraid flood <limite> <segundos>
{prefix}antiraid flood 8 12

Define quantas mensagens um membro pode enviar dentro da janela de tempo. Exemplo: 8 mensagens em 12 segundos. A janela também é usada para os limites de repetição, links e convites.

🔗 4. Configure os limites de links e convites:
{prefix}antiraid links <limite-links> <limite-convites>
{prefix}antiraid links 3 2

Define quantos links e convites um membro pode enviar durante a janela configurada em flood. No Discord com escopo servidor, os limites continuam contando entre canais.

👤 5. Gerencie as exceções por usuário:
Adicione ou remova usuários respondendo à mensagem, mencionando-os ou informando ID/número. Usuários na lista branca são ignorados pela proteção; a lista negra garante que sejam sempre monitorados.
{prefix}antiraid userwhitelist add <usuário|ID>
{prefix}antiraid userwhitelist remove <usuário|ID>
{prefix}antiraid userwhitelist list
{prefix}antiraid userblacklist add <usuário|ID>
{prefix}antiraid userblacklist remove <usuário|ID>
{prefix}antiraid userblacklist list

No Discord, também é possível gerenciar exceções por cargo. A lista branca isenta o cargo; a lista negra garante que membros com esse cargo sejam sempre monitorados.
{prefix}antiraid rolewhitelist add <@cargo|ID|nome>
{prefix}antiraid rolewhitelist remove <@cargo|ID|nome>
{prefix}antiraid rolewhitelist list
{prefix}antiraid roleblacklist add <@cargo|ID|nome>
{prefix}antiraid roleblacklist remove <@cargo|ID|nome>
{prefix}antiraid roleblacklist list

📊 Consulte o estado e as configurações:
{prefix}antiraid status`,
    usage: "{prefix}antiraid [subcomando]",
    examples: [
        "{prefix}antiraid status",
        "{prefix}antiraid on",
        "{prefix}antiraid off",
        "{prefix}antiraid action mute",
        "{prefix}antiraid action ban",
        "{prefix}antiraid flood 8 12",
        "{prefix}antiraid links 3 2",
        "{prefix}antiraid userwhitelist add @usuario",
        "{prefix}antiraid userblacklist add @usuario",
        "{prefix}antiraid rolewhitelist add @Cargo",
        "{prefix}antiraid roleblacklist add @Cargo"
    ],

    async execute(message) {
        if (!message || message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores." });
        }

        const sender = message.sender || {};
        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = sender.isOwner || isOwner(message) || (adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : (sender.isAdmin || sender.canManageMessages));

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores ou super usuários podem usar este comando." });
        }

        const args = Array.isArray(message.args) ? message.args : [];
        const resolved = resolveAntiRaidConfig(message);
        const currentCfg = resolved?.config || {
            enabled: false,
            action: "mute",
            maxMessagesPerWindow: 8,
            windowSeconds: 12,
            userWhitelist: [],
            userBlacklist: [],
            roleWhitelist: [],
            roleBlacklist: []
        };

        const first = (args[0] || "").toLowerCase();
        if (!args.length || first === "help" || first === "ajuda") {
            return message.reply({ text: _help(message) });
        }

        const defaultLevel = message.platform === "discord" ? "server" : message.platform === "whatsapp" ? "chat" : "server";

        if (first === "status") {
            const uwCount = (currentCfg.userWhitelist || []).length;
            const ubCount = (currentCfg.userBlacklist || []).length;
            const rwCount = (currentCfg.roleWhitelist || []).length;
            const rbCount = (currentCfg.roleBlacklist || []).length;

            const lines = [
                "🛡️ *Status do Anti-Raid*",
                "",
                `• Ativo: ${currentCfg.enabled ? "✅ Sim" : "❌ Não"}`,
                `• Ação: ${currentCfg.action || "mute"}`,
                `• Limite: ${currentCfg.maxMessagesPerWindow || 8} msgs em ${currentCfg.windowSeconds || 12}s`,
                `• Mensagens repetidas: ${currentCfg.repeatedMessageLimit || 4} em ${currentCfg.windowSeconds || 12}s`,
                `• Links: ${currentCfg.linkLimit || 3} em ${currentCfg.windowSeconds || 12}s`,
                `• Convites: ${currentCfg.inviteLimit || 2} em ${currentCfg.windowSeconds || 12}s`,
                `• Nível: ${resolved?.level || defaultLevel}`,
                `• Usuários na lista branca: ${uwCount}`,
                `• Usuários na lista negra: ${ubCount}`
            ];

            if (message.platform === "discord") {
                lines.push(`• Cargos na lista branca: ${rwCount}`);
                lines.push(`• Cargos na lista negra: ${rbCount}`);
            }

            lines.push("");
            lines.push("Uso:");
            lines.push(`• ${message.prefix}antiraid on | off`);
            lines.push(`• ${message.prefix}antiraid action mute | kick | ban`);
            lines.push(`• ${message.prefix}antiraid flood <limite> <segundos>`);
            lines.push(`• ${message.prefix}antiraid links <limite-links> <limite-convites>`);
            lines.push(`• ${message.prefix}antiraid userwhitelist add|remove|list [usuário|@|ID]`);
            lines.push(`• ${message.prefix}antiraid userblacklist add|remove|list [usuário|@|ID]`);
            if (message.platform === "discord") {
                lines.push(`• ${message.prefix}antiraid rolewhitelist add|remove|list [@Cargo|ID|Nome]`);
                lines.push(`• ${message.prefix}antiraid roleblacklist add|remove|list [@Cargo|ID|Nome]`);
            }

            return message.reply({ text: lines.join("\n") });
        }

        if (first === "on" || first === "off") {
            const enabled = first === "on";
            getSetAntiRaid(message, defaultLevel, {
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
                groupOnly: currentCfg.groupOnly !== false,
                userWhitelist: currentCfg.userWhitelist || [],
                userBlacklist: currentCfg.userBlacklist || [],
                roleWhitelist: currentCfg.roleWhitelist || [],
                roleBlacklist: currentCfg.roleBlacklist || []
            });
            return message.reply({ text: `✅ Anti-raid ${enabled ? "ativado" : "desativado"} neste ${message.platform === "discord" ? "servidor" : "grupo"}.` });
        }

        if (first === "action") {
            const action = normalizeAction(args[1]);
            if (!action) {
                return message.reply({ text: "❌ Ação inválida. Use: mute, timeout, kick ou ban." });
            }
            getSetAntiRaid(message, defaultLevel, {
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
                groupOnly: currentCfg.groupOnly !== false,
                userWhitelist: currentCfg.userWhitelist || [],
                userBlacklist: currentCfg.userBlacklist || [],
                roleWhitelist: currentCfg.roleWhitelist || [],
                roleBlacklist: currentCfg.roleBlacklist || []
            });
            return message.reply({ text: `✅ Ação do anti-raid atualizada para: *${action}*.` });
        }

        if (first === "flood") {
            const limit = Number(args[1]);
            const seconds = Number(args[2]);
            if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(seconds) || seconds <= 0) {
                return message.reply({ text: "❌ Uso correto: `!antiraid flood 8 12` (8 msgs em 12 segundos)." });
            }
            getSetAntiRaid(message, defaultLevel, {
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
                groupOnly: currentCfg.groupOnly !== false,
                userWhitelist: currentCfg.userWhitelist || [],
                userBlacklist: currentCfg.userBlacklist || [],
                roleWhitelist: currentCfg.roleWhitelist || [],
                roleBlacklist: currentCfg.roleBlacklist || []
            });
            return message.reply({ text: `✅ Flood do anti-raid ajustado para *${limit} mensagens em ${seconds} segundos*.` });
        }

        if (first === "links") {
            const linkLimit = Number(args[1]);
            const inviteLimit = Number(args[2]);
            if (!Number.isInteger(linkLimit) || linkLimit <= 0 || !Number.isInteger(inviteLimit) || inviteLimit <= 0) {
                return message.reply({ text: `❌ Uso correto: \`${message.prefix}antiraid links 3 2\` (3 links e 2 convites na janela configurada).` });
            }
            getSetAntiRaid(message, defaultLevel, {
                enabled: currentCfg.enabled === true,
                action: currentCfg.action || "mute",
                maxMessagesPerWindow: currentCfg.maxMessagesPerWindow || 8,
                windowSeconds: currentCfg.windowSeconds || 12,
                repeatedMessageLimit: currentCfg.repeatedMessageLimit || 4,
                inviteLimit,
                linkLimit,
                mentionLimit: currentCfg.mentionLimit || 6,
                webhookLimit: currentCfg.webhookLimit || 0,
                groupId: currentCfg.groupId || null,
                applyToTopics: currentCfg.applyToTopics !== false,
                serverOnly: currentCfg.serverOnly !== false,
                communityBypass: currentCfg.communityBypass !== false,
                groupOnly: currentCfg.groupOnly !== false,
                userWhitelist: currentCfg.userWhitelist || [],
                userBlacklist: currentCfg.userBlacklist || [],
                roleWhitelist: currentCfg.roleWhitelist || [],
                roleBlacklist: currentCfg.roleBlacklist || []
            });
            return message.reply({
                text: `✅ Limites ajustados: *${linkLimit} links* e *${inviteLimit} convites* em ${currentCfg.windowSeconds || 12}s.`
            });
        }

        // ── userwhitelist ───────────────────────────────────────────────
        if (first === "userwhitelist" || first === "uw") {
            const actionUw = (args[1] || "").toLowerCase();
            const current = getSetAntiRaid(message, defaultLevel);
            const userWhitelist = Array.isArray(current?.userWhitelist) ? [...current.userWhitelist] : [];

            if (actionUw === "list") {
                return message.reply({
                    text: userWhitelist.length
                        ? `👤 Usuários na lista branca do Anti-Raid:\n${userWhitelist.map(u => `- ${formatUserMention(message, u)} (${u})`).join("\n")}`
                        : `🔕 Nenhum usuário na lista branca do Anti-Raid.`
                });
            }

            const target = resolveTargetUser(message, 2);
            if (!target && (actionUw === "add" || actionUw === "remove")) {
                return message.reply({ text: "❌ Informe o usuário respondendo à mensagem, mencionando (@) ou informando o ID/número." });
            }

            if (actionUw === "add") {
                if (userWhitelist.some(u => sameUserId(u, target.id))) {
                    return message.reply({ text: `❌ O usuário ${target.mention} já está na lista branca do Anti-Raid.` });
                }
                userWhitelist.push(target.id);
                const userBlacklist = (Array.isArray(current?.userBlacklist) ? [...current.userBlacklist] : []).filter(u => !sameUserId(u, target.id));
                getSetAntiRaid(message, defaultLevel, { userWhitelist, userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} adicionado à lista branca do Anti-Raid.` });
            } else if (actionUw === "remove") {
                const idx = userWhitelist.findIndex(u => sameUserId(u, target.id));
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário ${target.mention} não está na lista branca do Anti-Raid.` });
                }
                userWhitelist.splice(idx, 1);
                getSetAntiRaid(message, defaultLevel, { userWhitelist });
                return message.reply({ text: `✅ Usuário ${target.mention} removido da lista branca do Anti-Raid.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antiraid userwhitelist add|remove|list [usuário|@|ID]` });
        }

        // ── userblacklist ───────────────────────────────────────────────
        if (first === "userblacklist" || first === "ub") {
            const actionUb = (args[1] || "").toLowerCase();
            const current = getSetAntiRaid(message, defaultLevel);
            const userBlacklist = Array.isArray(current?.userBlacklist) ? [...current.userBlacklist] : [];

            if (actionUb === "list") {
                return message.reply({
                    text: userBlacklist.length
                        ? `🚫 Usuários na lista negra do Anti-Raid:\n${userBlacklist.map(u => `- ${formatUserMention(message, u)} (${u})`).join("\n")}`
                        : `🔕 Nenhum usuário na lista negra do Anti-Raid.`
                });
            }

            const target = resolveTargetUser(message, 2);
            if (!target && (actionUb === "add" || actionUb === "remove")) {
                return message.reply({ text: "❌ Informe o usuário respondendo à mensagem, mencionando (@) ou informando o ID/número." });
            }

            if (actionUb === "add") {
                if (userBlacklist.some(u => sameUserId(u, target.id))) {
                    return message.reply({ text: `❌ O usuário ${target.mention} já está na lista negra do Anti-Raid.` });
                }
                userBlacklist.push(target.id);
                const userWhitelist = (Array.isArray(current?.userWhitelist) ? [...current.userWhitelist] : []).filter(u => !sameUserId(u, target.id));
                getSetAntiRaid(message, defaultLevel, { userWhitelist, userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} adicionado à lista negra do Anti-Raid.` });
            } else if (actionUb === "remove") {
                const idx = userBlacklist.findIndex(u => sameUserId(u, target.id));
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário ${target.mention} não está na lista negra do Anti-Raid.` });
                }
                userBlacklist.splice(idx, 1);
                getSetAntiRaid(message, defaultLevel, { userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} removido da lista negra do Anti-Raid.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antiraid userblacklist add|remove|list [usuário|@|ID]` });
        }

        // ── rolewhitelist (Discord) ─────────────────────────────────────
        if (first === "rolewhitelist" || first === "rw") {
            if (message.platform !== "discord") {
                return message.reply({ text: "❌ A lista de cargos é exclusiva para servidores do Discord." });
            }
            const actionRw = (args[1] || "").toLowerCase();
            const current = getSetAntiRaid(message, defaultLevel);
            const roleWhitelist = Array.isArray(current?.roleWhitelist) ? [...current.roleWhitelist] : [];

            if (actionRw === "list") {
                return message.reply({
                    text: roleWhitelist.length
                        ? `🛡️ Cargos na lista branca do Anti-Raid:\n${roleWhitelist.map(r => `- ${formatRoleMention(r, message.raw?.guild)}`).join("\n")}`
                        : `🔕 Nenhum cargo na lista branca do Anti-Raid.`
                });
            }

            const targetRole = resolveTargetRole(message, 2);
            if (!targetRole || targetRole.error) {
                return message.reply({ text: targetRole?.error || "❌ Informe o cargo mencionando (@Cargo), digitando o ID ou o nome." });
            }

            if (actionRw === "add") {
                if (roleWhitelist.includes(targetRole.id)) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} já está na lista branca do Anti-Raid.` });
                }
                roleWhitelist.push(targetRole.id);
                const roleBlacklist = (Array.isArray(current?.roleBlacklist) ? [...current.roleBlacklist] : []).filter(r => r !== targetRole.id);
                getSetAntiRaid(message, defaultLevel, { roleWhitelist, roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} adicionado à lista branca do Anti-Raid.` });
            } else if (actionRw === "remove") {
                const idx = roleWhitelist.indexOf(targetRole.id);
                if (idx === -1) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} não está na lista branca do Anti-Raid.` });
                }
                roleWhitelist.splice(idx, 1);
                getSetAntiRaid(message, defaultLevel, { roleWhitelist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} removido da lista branca do Anti-Raid.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antiraid rolewhitelist add|remove|list [@Cargo|ID|Nome]` });
        }

        // ── roleblacklist (Discord) ─────────────────────────────────────
        if (first === "roleblacklist" || first === "rb") {
            if (message.platform !== "discord") {
                return message.reply({ text: "❌ A lista de cargos é exclusiva para servidores do Discord." });
            }
            const actionRb = (args[1] || "").toLowerCase();
            const current = getSetAntiRaid(message, defaultLevel);
            const roleBlacklist = Array.isArray(current?.roleBlacklist) ? [...current.roleBlacklist] : [];

            if (actionRb === "list") {
                return message.reply({
                    text: roleBlacklist.length
                        ? `🚫 Cargos na lista negra do Anti-Raid:\n${roleBlacklist.map(r => `- ${formatRoleMention(r, message.raw?.guild)}`).join("\n")}`
                        : `🔕 Nenhum cargo na lista negra do Anti-Raid.`
                });
            }

            const targetRole = resolveTargetRole(message, 2);
            if (!targetRole || targetRole.error) {
                return message.reply({ text: targetRole?.error || "❌ Informe o cargo mencionando (@Cargo), digitando o ID ou o nome." });
            }

            if (actionRb === "add") {
                if (roleBlacklist.includes(targetRole.id)) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} já está na lista negra do Anti-Raid.` });
                }
                roleBlacklist.push(targetRole.id);
                const roleWhitelist = (Array.isArray(current?.roleWhitelist) ? [...current.roleWhitelist] : []).filter(r => r !== targetRole.id);
                getSetAntiRaid(message, defaultLevel, { roleWhitelist, roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} adicionado à lista negra do Anti-Raid.` });
            } else if (actionRb === "remove") {
                const idx = roleBlacklist.indexOf(targetRole.id);
                if (idx === -1) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} não está na lista negra do Anti-Raid.` });
                }
                roleBlacklist.splice(idx, 1);
                getSetAntiRaid(message, defaultLevel, { roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} removido da lista negra do Anti-Raid.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antiraid roleblacklist add|remove|list [@Cargo|ID|Nome]` });
        }

        const toggle = normalizeToggle(args[0]);
        if (toggle !== null) {
            getSetAntiRaid(message, defaultLevel, {
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
                groupOnly: currentCfg.groupOnly !== false,
                userWhitelist: currentCfg.userWhitelist || [],
                userBlacklist: currentCfg.userBlacklist || [],
                roleWhitelist: currentCfg.roleWhitelist || [],
                roleBlacklist: currentCfg.roleBlacklist || []
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
    lines.push('Protege contra flood de mensagens/imagens, repetição de conteúdo, excesso de links/convites e riscos de menções/webhooks. Os contadores usam a janela configurada e são separados por membro.');
    lines.push('');
    lines.push('🌐 ESCOPO POR PLATAFORMA:');
    lines.push('  • Discord: no nível servidor, soma mensagens do mesmo membro em todos os canais e threads do servidor.');
    lines.push('  • Telegram: conta no grupo; mensagens nos tópicos pertencentes ao grupo entram na mesma proteção.');
    lines.push('  • WhatsApp: conta mensagens no grupo; ações mute/remove usam remoção do membro, pois a plataforma não oferece mute individual.');
    lines.push('  • Imagens e outros anexos contam como mensagens para o limite de flood. Links e convites no texto têm contadores próprios.');
    lines.push('  • Menções em excesso e mensagens identificadas como webhook também são avaliadas pelos limites anti-raid configurados.');
    lines.push('  • Administradores, donos e usuários/cargos na lista branca são ignorados. A proteção não verifica arquivos em busca de vírus.');
    lines.push('');
    lines.push('📋 COMANDOS DISPONÍVEIS:');
    lines.push('  `' + p + 'antiraid status`');
    lines.push('    ↳ Exibe o estado atual, limites configurados e listas.');
    lines.push('');
    lines.push('  `' + p + 'antiraid on` | `' + p + 'antiraid off`');
    lines.push('    ↳ Ativa ou desativa a proteção no nível atual.');
    lines.push('');
    lines.push('  `' + p + 'antiraid action <mute|kick|ban>`');
    lines.push('    ↳ Define a ação tomada contra contas que violam limites. Ações disponíveis: ' + actions + '.');
    lines.push('');
    lines.push('  `' + p + 'antiraid flood <limite> <segundos>`');
    lines.push('    ↳ Define o limite de mensagens na janela e a duração usada também para repetição, links e convites (ex: `'+p+'antiraid flood 8 12` = 8 mensagens em 12s).');
    lines.push('');
    lines.push('  `' + p + 'antiraid links <limite-links> <limite-convites>`');
    lines.push('    ↳ Define quantos links e convites um membro pode enviar durante a janela `flood` (ex: `'+p+'antiraid links 3 2`).');
    lines.push('    ↳ No Discord com escopo servidor, os limites continuam contando entre canais. O bloqueio ocorre quando um limite é atingido.');
    lines.push('');
    lines.push('  `' + p + 'antiraid userwhitelist <add|remove|list> [usuário|@|ID]`');
    lines.push('    ↳ Isenta usuários específicos da proteção anti-raid.');
    lines.push('');
    lines.push('  `' + p + 'antiraid userblacklist <add|remove|list> [usuário|@|ID]`');
    lines.push('    ↳ Coloca usuários na lista negra do anti-raid.');
    lines.push('');
    if (plat === 'discord') {
        lines.push('  `' + p + 'antiraid rolewhitelist <add|remove|list> [@Cargo|ID|Nome]`');
        lines.push('    ↳ Isenta membros que possuem determinados cargos.');
        lines.push('');
        lines.push('  `' + p + 'antiraid roleblacklist <add|remove|list> [@Cargo|ID|Nome]`');
        lines.push('    ↳ Coloca cargos na lista negra do anti-raid.');
        lines.push('');
    }
    lines.push('⚙️ DICAS E REGRAS:');
    lines.push('  • No Discord, aplique por servidor para proteger todos os canais (server scope).');
    lines.push('  • No Telegram, o padrão é o grupo, incluindo mensagens nos tópicos; no WhatsApp, o escopo é o grupo.');
    lines.push('  • Se a proteção estiver configurada em um canal/categoria específico, a contagem respeita esse escopo local.');
    lines.push('  • O status mostra os limites ativos. `flood` define a janela compartilhada; `links` altera apenas as quantidades de links e convites.');
    lines.push('  • Para adicionar usuários, você pode citar/responder uma mensagem, usar menção @ ou passar o ID/número.');
    lines.push('');
    lines.push('📌 EXEMPLOS:');
    lines.push('  ' + p + 'antiraid on');
    lines.push('  ' + p + 'antiraid action mute');
    lines.push('  ' + p + 'antiraid flood 10 15');
    lines.push('  ' + p + 'antiraid userwhitelist add @membro');
    lines.push('  ' + p + 'antiraid userblacklist add 5511999999999');

    return lines.join('\n');
}
