/*
=================================================================

COMANDO: !antilink

Gerencia as regras de Antilink por nível hierárquico.
Apenas administradores do chat podem usar.

Os níveis disponíveis variam conforme a plataforma:

  Discord   →  server | categoria | chat
  WhatsApp  →  server | chat       (server só em comunidade)
  Telegram  →  server | chat       (chat só em fórum/tópico)

Sub-comandos:
  !antilink status
  !antilink <nivel> on|off
  !antilink <nivel> action  delete|warn|kick|ban
  !antilink <nivel> message <texto...>
  !antilink <nivel> ignoreparent on|off

=================================================================
*/

const {
    getLevelLabel,
    getAvailableLevels,
    getSetAntilink
} = require("../../../functions/antilinkHelper");
const { isOwner } = require("../../../functions/owners");

// Ações válidas e suas descrições legíveis
const ACTIONS = {
    delete: "🗑️ Deletar mensagem (silencioso)",
    warn:   "⚠️ Deletar + Avisar",
    kick:   "🚫 Deletar + Expulsar",
    ban:    "🔨 Deletar + Banir"
};

// Ações que exigem permissão de moderação extra no bot
const STRONG_ACTIONS = ["kick", "ban"];

module.exports = {
    name: "antilink",
    category: "adm/segurança",
    description: `Gerencia as regras de Antilink por nível hierárquico. O antilink deleta mensagens que contenham links e aplica punições.
Funções disponíveis:
• on/off: Ativa ou desativa o antilink no nível especificado.
• action <delete|warn|kick|ban>: Define a punição (deletar, avisar, expulsar ou banir).
• message <texto>: Define uma mensagem de aviso personalizada ao punir.
• ignoreparent <on|off>: Define se o nível atual ignora configurações de níveis superiores.
• ignoresame <on|off>: Permite o envio do link de convite do próprio grupo/servidor.
• ignoremedia <on|off>: Permite o envio de links de mídias (youtube, tiktok, instagram, etc).
• whitelist <add|remove|list> [link]: Gerencia domínios permitidos (lista branca de links).
• userwhitelist <add|remove|list> [ID]: Gerencia usuários isentos (lista branca de usuários).`,
    usage: "{prefix}antilink status",
    examples: [
        "{prefix}antilink status",
        "{prefix}antilink chat on",
        "{prefix}antilink chat action warn",
        "{prefix}antilink chat ignoresame on",
        "{prefix}antilink chat ignoremedia on",
        "{prefix}antilink chat whitelist add github.com",
        "{prefix}antilink chat whitelist list",
        "{prefix}antilink chat userwhitelist add 5511999990000",
        "{prefix}antilink chat userwhitelist list"
    ],

    info(message) {
        return _help(message);
    },

    async execute(message) {
        // ── 1. Bloqueio: apenas em grupos ──────────────────────────────
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos/servidores." });
        }

        // ── 2. Permissão do USUÁRIO ─────────────────────────────────────
        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk  = isOwner(message) || (adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin);

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores podem configurar o antilink." });
        }

        const args     = message.args || [];
        const platform = message.platform;

        // ── 3. Sem args → ajuda ─────────────────────────────────────────
        if (!args.length) {
            return message.reply({ text: _help(message) });
        }

        const first = args[0].toLowerCase();

        // ── 4. Status ───────────────────────────────────────────────────
        if (first === "status") {
            return message.reply({ text: await _status(message, adapter) });
        }

        // ── 5. Operações de configuração ────────────────────────────────
        const level = first;
        const available = getAvailableLevels(message);

        if (!available.includes(level)) {
            const list = available.map(l => `*${l}* (${getLevelLabel(platform, l)})`).join("\n  ");
            return message.reply({
                text: `❌ Nível *${level}* não disponível aqui.\n\nNíveis disponíveis:\n  ${list}`
            });
        }

        const subCmd = (args[1] || "").toLowerCase();

        // ── 5a. on | off ────────────────────────────────────────────────
        if (subCmd === "on" || subCmd === "off") {
            const enabling = subCmd === "on";

            // Se for ativar com ação forte, checar permissão do bot
            if (enabling) {
                const current = getSetAntilink(message, level);
                const action  = current?.action || "delete";
                if (STRONG_ACTIONS.includes(action)) {
                    const botOk = adapter?.checkBotPermission
                        ? await adapter.checkBotPermission(message.chatId, action)
                        : false;
                    if (!botOk) {
                        return message.reply({
                            text: `⚠️ O bot não tem permissão para executar a ação *${action}*.\nConceda as permissões de administrador e tente novamente, ou altere a ação com:\n  ${message.prefix}antilink ${level} action delete`
                        });
                    }
                }
            }

            getSetAntilink(message, level, { enabled: enabling });
            const lbl = getLevelLabel(platform, level);
            return message.reply({
                text: enabling
                    ? `✅ Antilink ativado no nível *${lbl}*.`
                    : `🔕 Antilink desativado no nível *${lbl}*.`
            });
        }

        // ── 5b. action ──────────────────────────────────────────────────
        if (subCmd === "action") {
            const newAction = (args[2] || "").toLowerCase();

            if (!ACTIONS[newAction]) {
                const list = Object.entries(ACTIONS)
                    .map(([k, v]) => `  *${k}* — ${v}`)
                    .join("\n");
                return message.reply({ text: `❌ Ação inválida.\n\nAções disponíveis:\n${list}` });
            }

            // Verifica permissão do bot para ações fortes
            if (STRONG_ACTIONS.includes(newAction)) {
                const botOk = adapter?.checkBotPermission
                    ? await adapter.checkBotPermission(message.chatId, newAction)
                    : false;
                if (!botOk) {
                    return message.reply({
                        text: `⚠️ O bot não tem permissão para executar *${newAction}* neste chat.\nConceda permissões de administrador primeiro.`
                    });
                }
            }

            getSetAntilink(message, level, { action: newAction });
            const lbl = getLevelLabel(platform, level);
            return message.reply({
                text: `✅ Ação do antilink no nível *${lbl}* alterada para *${newAction}*.\n${ACTIONS[newAction]}`
            });
        }

        // ── 5c. message ─────────────────────────────────────────────────
        if (subCmd === "message") {
            const newMsg = (message.getArgText ? message.getArgText(2) : args.slice(2).join(" ")).trim();
            if (!newMsg) {
                return message.reply({ text: "❌ Informe a mensagem. Ex: !antilink chat message Links são proibidos aqui!" });
            }
            getSetAntilink(message, level, { message: newMsg });
            const lbl = getLevelLabel(platform, level);
            return message.reply({
                text: `✅ Mensagem do antilink no nível *${lbl}* atualizada:\n"${newMsg}"`
            });
        }

        // ── 5d. ignoreparent ────────────────────────────────────────────
        if (subCmd === "ignoreparent") {
            const val = (args[2] || "").toLowerCase();
            if (val !== "on" && val !== "off") {
                return message.reply({ text: "❌ Use: !antilink <nivel> ignoreparent on|off" });
            }
            const ignoring = val === "on";
            getSetAntilink(message, level, { ignoreParent: ignoring });
            const lbl = getLevelLabel(platform, level);
            return message.reply({
                text: ignoring
                    ? `✅ *${lbl}* agora ignora as regras dos níveis superiores.`
                    : `✅ *${lbl}* agora herda as regras dos níveis superiores.`
            });
        }

        // ── 5e. ignoresame ──────────────────────────────────────────────
        if (subCmd === "ignoresame") {
            const val = (args[2] || "").toLowerCase();
            if (val !== "on" && val !== "off") {
                return message.reply({ text: "❌ Use: !antilink <nivel> ignoresame on|off" });
            }
            const ignoring = val === "on";
            getSetAntilink(message, level, { ignoreSameGroup: ignoring });
            const lbl = getLevelLabel(platform, level);
            return message.reply({
                text: ignoring
                    ? `✅ *${lbl}* agora ignora links do próprio grupo/servidor.`
                    : `✅ *${lbl}* agora NÃO ignora links do próprio grupo/servidor.`
            });
        }

        // ── 5f. ignoremedia ─────────────────────────────────────────────
        if (subCmd === "ignoremedia") {
            const val = (args[2] || "").toLowerCase();
            if (val !== "on" && val !== "off") {
                return message.reply({ text: "❌ Use: !antilink <nivel> ignoremedia on|off" });
            }
            const ignoring = val === "on";
            getSetAntilink(message, level, { ignoreMedia: ignoring });
            const lbl = getLevelLabel(platform, level);
            return message.reply({
                text: ignoring
                    ? `✅ *${lbl}* agora ignora links de mídias (downloads como YT, TikTok, IG).`
                    : `✅ *${lbl}* agora NÃO ignora links de mídias.`
            });
        }

        // ── 5g. whitelist ───────────────────────────────────────────────
        if (subCmd === "whitelist") {
            const actionWl = (args[2] || "").toLowerCase(); // add, remove, list
            const current = getSetAntilink(message, level);
            const whitelist = Array.isArray(current?.whitelist) ? [...current.whitelist] : [];
            const lbl = getLevelLabel(platform, level);

            if (actionWl === "list") {
                return message.reply({
                    text: whitelist.length
                        ? `✅ Lista branca em *${lbl}*:\n${whitelist.map(w => `- ${w}`).join("\n")}`
                        : `🔕 Lista branca vazia em *${lbl}*.`
                });
            }

            const link = args[3];
            if (!link && (actionWl === "add" || actionWl === "remove")) {
                return message.reply({ text: "❌ Informe um link/domínio. Ex: !antilink <nivel> whitelist add youtube.com" });
            }

            if (actionWl === "add") {
                if (whitelist.includes(link)) {
                    return message.reply({ text: "❌ Este link já está na lista branca." });
                }
                whitelist.push(link);
                getSetAntilink(message, level, { whitelist });
                return message.reply({ text: `✅ *${link}* adicionado à lista branca em *${lbl}*.` });
            } else if (actionWl === "remove") {
                const idx = whitelist.indexOf(link);
                if (idx === -1) {
                    return message.reply({ text: "❌ Este link não está na lista branca." });
                }
                whitelist.splice(idx, 1);
                getSetAntilink(message, level, { whitelist });
                return message.reply({ text: `✅ *${link}* removido da lista branca em *${lbl}*.` });
            }

            return message.reply({ text: "❌ Use: !antilink <nivel> whitelist add|remove|list [link]" });
        }

        // ── 5h. userwhitelist ───────────────────────────────────────────
        if (subCmd === "userwhitelist" || subCmd === "uw") {
            const actionUw = (args[2] || "").toLowerCase(); // add, remove, list
            const current = getSetAntilink(message, level);
            const userWhitelist = Array.isArray(current?.userWhitelist) ? [...current.userWhitelist] : [];
            const lbl = getLevelLabel(platform, level);

            if (actionUw === "list") {
                return message.reply({
                    text: userWhitelist.length
                        ? `👤 Usuários na lista branca em *${lbl}*:\n${userWhitelist.map(u => `- ${formatUserMention(message, u)} (${u})`).join("\n")}`
                        : `🔕 Nenhum usuário na lista branca em *${lbl}*.`
                });
            }

            const target = resolveTargetUser(message, 3);
            if (!target && (actionUw === "add" || actionUw === "remove")) {
                return message.reply({ text: "❌ Informe o usuário respondendo à mensagem, mencionando (@) ou informando o ID/número." });
            }

            if (actionUw === "add") {
                if (userWhitelist.some(u => sameUserId(u, target.id))) {
                    return message.reply({ text: `❌ O usuário ${target.mention} já está na lista branca.` });
                }
                userWhitelist.push(target.id);
                const userBlacklist = (Array.isArray(current?.userBlacklist) ? [...current.userBlacklist] : []).filter(u => !sameUserId(u, target.id));
                getSetAntilink(message, level, { userWhitelist, userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} adicionado à lista branca em *${lbl}*.` });
            } else if (actionUw === "remove") {
                const idx = userWhitelist.findIndex(u => sameUserId(u, target.id));
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário ${target.mention} não está na lista branca.` });
                }
                userWhitelist.splice(idx, 1);
                getSetAntilink(message, level, { userWhitelist });
                return message.reply({ text: `✅ Usuário ${target.mention} removido da lista branca em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antilink <nivel> userwhitelist add|remove|list [usuário|@|ID]` });
        }

        // ── 5i. userblacklist ───────────────────────────────────────────
        if (subCmd === "userblacklist" || subCmd === "ub") {
            const actionUb = (args[2] || "").toLowerCase();
            const current = getSetAntilink(message, level);
            const userBlacklist = Array.isArray(current?.userBlacklist) ? [...current.userBlacklist] : [];
            const lbl = getLevelLabel(platform, level);

            if (actionUb === "list") {
                return message.reply({
                    text: userBlacklist.length
                        ? `🚫 Usuários na lista negra em *${lbl}*:\n${userBlacklist.map(u => `- ${formatUserMention(message, u)} (${u})`).join("\n")}`
                        : `🔕 Nenhum usuário na lista negra em *${lbl}*.`
                });
            }

            const target = resolveTargetUser(message, 3);
            if (!target && (actionUb === "add" || actionUb === "remove")) {
                return message.reply({ text: "❌ Informe o usuário respondendo à mensagem, mencionando (@) ou informando o ID/número." });
            }

            if (actionUb === "add") {
                if (userBlacklist.some(u => sameUserId(u, target.id))) {
                    return message.reply({ text: `❌ O usuário ${target.mention} já está na lista negra.` });
                }
                userBlacklist.push(target.id);
                const userWhitelist = (Array.isArray(current?.userWhitelist) ? [...current.userWhitelist] : []).filter(u => !sameUserId(u, target.id));
                getSetAntilink(message, level, { userWhitelist, userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} adicionado à lista negra em *${lbl}*.` });
            } else if (actionUb === "remove") {
                const idx = userBlacklist.findIndex(u => sameUserId(u, target.id));
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário ${target.mention} não está na lista negra.` });
                }
                userBlacklist.splice(idx, 1);
                getSetAntilink(message, level, { userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} removido da lista negra em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antilink <nivel> userblacklist add|remove|list [usuário|@|ID]` });
        }

        // ── 5j. rolewhitelist (Discord) ─────────────────────────────────
        if (subCmd === "rolewhitelist" || subCmd === "rw") {
            if (platform !== "discord") {
                return message.reply({ text: "❌ A lista de cargos é exclusiva para servidores do Discord." });
            }
            const actionRw = (args[2] || "").toLowerCase();
            const current = getSetAntilink(message, level);
            const roleWhitelist = Array.isArray(current?.roleWhitelist) ? [...current.roleWhitelist] : [];
            const lbl = getLevelLabel(platform, level);

            if (actionRw === "list") {
                return message.reply({
                    text: roleWhitelist.length
                        ? `🛡️ Cargos na lista branca em *${lbl}*:\n${roleWhitelist.map(r => `- ${formatRoleMention(r, message.raw?.guild)}`).join("\n")}`
                        : `🔕 Nenhum cargo na lista branca em *${lbl}*.`
                });
            }

            const targetRole = resolveTargetRole(message, 3);
            if (!targetRole || targetRole.error) {
                return message.reply({ text: targetRole?.error || "❌ Informe o cargo mencionando (@Cargo), digitando o ID ou o nome." });
            }

            if (actionRw === "add") {
                if (roleWhitelist.includes(targetRole.id)) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} já está na lista branca.` });
                }
                roleWhitelist.push(targetRole.id);
                const roleBlacklist = (Array.isArray(current?.roleBlacklist) ? [...current.roleBlacklist] : []).filter(r => r !== targetRole.id);
                getSetAntilink(message, level, { roleWhitelist, roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} adicionado à lista branca em *${lbl}*.` });
            } else if (actionRw === "remove") {
                const idx = roleWhitelist.indexOf(targetRole.id);
                if (idx === -1) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} não está na lista branca.` });
                }
                roleWhitelist.splice(idx, 1);
                getSetAntilink(message, level, { roleWhitelist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} removido da lista branca em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antilink <nivel> rolewhitelist add|remove|list [@Cargo|ID|Nome]` });
        }

        // ── 5k. roleblacklist (Discord) ─────────────────────────────────
        if (subCmd === "roleblacklist" || subCmd === "rb") {
            if (platform !== "discord") {
                return message.reply({ text: "❌ A lista de cargos é exclusiva para servidores do Discord." });
            }
            const actionRb = (args[2] || "").toLowerCase();
            const current = getSetAntilink(message, level);
            const roleBlacklist = Array.isArray(current?.roleBlacklist) ? [...current.roleBlacklist] : [];
            const lbl = getLevelLabel(platform, level);

            if (actionRb === "list") {
                return message.reply({
                    text: roleBlacklist.length
                        ? `🚫 Cargos na lista negra em *${lbl}*:\n${roleBlacklist.map(r => `- ${formatRoleMention(r, message.raw?.guild)}`).join("\n")}`
                        : `🔕 Nenhum cargo na lista negra em *${lbl}*.`
                });
            }

            const targetRole = resolveTargetRole(message, 3);
            if (!targetRole || targetRole.error) {
                return message.reply({ text: targetRole?.error || "❌ Informe o cargo mencionando (@Cargo), digitando o ID ou o nome." });
            }

            if (actionRb === "add") {
                if (roleBlacklist.includes(targetRole.id)) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} já está na lista negra.` });
                }
                roleBlacklist.push(targetRole.id);
                const roleWhitelist = (Array.isArray(current?.roleWhitelist) ? [...current.roleWhitelist] : []).filter(r => r !== targetRole.id);
                getSetAntilink(message, level, { roleWhitelist, roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} adicionado à lista negra em *${lbl}*.` });
            } else if (actionRb === "remove") {
                const idx = roleBlacklist.indexOf(targetRole.id);
                if (idx === -1) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} não está na lista negra.` });
                }
                roleBlacklist.splice(idx, 1);
                getSetAntilink(message, level, { roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} removido da lista negra em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antilink <nivel> roleblacklist add|remove|list [@Cargo|ID|Nome]` });
        }

        // ── Fallback: ajuda ─────────────────────────────────────────────
        return message.reply({ text: _help(message) });
    }
};

// ─────────────────────────────────────────────────────────────
//  HELPERS DE RESPOSTA
// ─────────────────────────────────────────────────────────────

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;
    const lvls = getAvailableLevels(message);
    const levelList = lvls.map(l => `*${l}* (${getLevelLabel(plat, l)})`).join(" | ");

    // Precompute a readable list of actions to avoid complex nested template expressions
    const actionsList = Object.entries(ACTIONS).map(([k, v]) => `• \`${k}\` — ${v}`).join("\n  ");

    let header = `🔗 *ANTILINK — AJUDA*`;
    if (plat === "discord") header = `🎮 *ANTILINK (Discord) — AJUDA*`;
    else if (plat === "whatsapp") header = `📱 *ANTILINK (WhatsApp) — AJUDA*`;
    else if (plat === "telegram") header = `✈️ *ANTILINK (Telegram) — AJUDA*`;

    const lines = [];
    lines.push(header);
    lines.push("");
    lines.push("Níveis disponíveis aqui:");
    lines.push("  " + levelList);
    lines.push("");
    lines.push("Descrição:");
    lines.push("Gerencia regras de remoção de mensagens contendo links e aplica punições automáticas por nível (server/categoria/chat).");
    lines.push("");
    lines.push("⚙️ COMANDOS PRINCIPAIS:");
    lines.push('  • `' + p + 'antilink status`');
    lines.push("    ↳ Exibe o status e configurações aplicadas nos níveis disponíveis.");
    lines.push("");
    lines.push('  • `' + p + 'antilink <nivel> on|off`');
    lines.push("    ↳ Ativa ou desativa o antilink no nível especificado.");
    lines.push("");
    lines.push('  • `' + p + 'antilink <nivel> action <delete|warn|kick|ban>`');
    lines.push("    ↳ Define a punição automática. Ações fortes (kick/ban) exigem permissão do bot.");
    lines.push("");
    lines.push('  • `' + p + 'antilink <nivel> message <texto...>`');
    lines.push("    ↳ Mensagem personalizada enviada ao punir (use variáveis como {user}, {group}).");
    lines.push("");
    lines.push('  • `' + p + 'antilink <nivel> ignoreparent on|off`');
    lines.push("    ↳ Faz o nível atual ignorar (ou herdar) regras dos níveis superiores.");
    lines.push("");
    lines.push('  • `' + p + 'antilink <nivel> ignoresame on|off`');
    lines.push("    ↳ Permite/nega links do próprio grupo/servidor.");
    lines.push("");
    lines.push('  • `' + p + 'antilink <nivel> ignoremedia on|off`');
    lines.push("    ↳ Permite/nega links de mídias (YouTube, TikTok, Instagram...).");
    lines.push("");
    lines.push('  • `' + p + 'antilink <nivel> whitelist add|remove|list <domínio>`');
    lines.push("    ↳ Gerencia domínios permitidos.");
    lines.push("");
    lines.push('  • `' + p + 'antilink <nivel> userwhitelist add|remove|list <ID>`');
    lines.push("    ↳ Gerencia usuários isentos.");
    lines.push("");
    lines.push("🛡️ AÇÕES DISPONÍVEIS:");
    lines.push("  " + actionsList);
    lines.push("");
    lines.push("💡 OBSERVAÇÕES:");
    lines.push("  • Algumas ações (kick/ban) exigem permissões administrativas do bot.");
    lines.push("  • Use `" + p + "antilink <nivel> action delete` para garantir apenas remoção sem punição adicional.");
    lines.push("  • As listas brancas e usuários isentos são específicas por nível.");
    lines.push("");
    lines.push("📌 EXEMPLOS:");
    lines.push("  " + p + "antilink status");
    lines.push("  " + p + "antilink chat on");
    lines.push("  " + p + "antilink chat action warn");
    lines.push("  " + p + "antilink chat ignoresame on");
    lines.push("  " + p + "antilink chat whitelist add github.com");
    lines.push("  " + p + "antilink chat userwhitelist add 5511999990000");

    return lines.join("\n");
}



async function _status(message, adapter) {
    const platform  = message.platform;
    const available = getAvailableLevels(message);

    const lines = [];

    for (const level of available) {
        const lbl = getLevelLabel(platform, level);
        const cfg = getSetAntilink(message, level) || {};

        const statusIcon = cfg.enabled ? "✅ Ativo" : "🔕 Inativo";
        const actionTxt  = cfg.action  || "delete";
        const msgTxt     = cfg.message ? `"${cfg.message}"` : "(padrão)";
        const ipTxt      = cfg.ignoreParent ? "✅ Sim" : "❌ Não";
        const isgTxt     = cfg.ignoreSameGroup ? "✅ Sim" : "❌ Não";
        const imTxt      = cfg.ignoreMedia ? "✅ Sim" : "❌ Não";
        const wlTxt      = (cfg.whitelist && cfg.whitelist.length) ? cfg.whitelist.join(", ") : "Nenhuma";
        const uwlTxt     = (cfg.userWhitelist && cfg.userWhitelist.length) ? cfg.userWhitelist.join(", ") : "Nenhum";

        // Verifica se o bot tem permissão para a ação configurada
        let botPermTxt = "";
        if (cfg.enabled && adapter?.checkBotPermission) {
            const botOk = await adapter.checkBotPermission(message.chatId, actionTxt);
            if (!botOk) {
                botPermTxt = "\n     ⚠️ Bot sem permissão para esta ação!";
            }
        }

        lines.push(
`[${lbl}]
  Estado:       ${statusIcon}
  Ação:         ${actionTxt} — ${ACTIONS[actionTxt] || ""}
  Mensagem:     ${msgTxt}
  IgnorarSuperior: ${ipTxt}
  IgnorarMesmoGrupo: ${isgTxt}
  IgnorarMidias: ${imTxt}
  ListaBranca:  ${wlTxt}
  UsuáriosBrancos: ${uwlTxt}${botPermTxt}`
        );
    }

    const header = _platformHeader(platform);
    return `${header}\n\n${lines.join("\n\n")}`;
}

function _platformHeader(platform) {
    const heads = {
        discord:  "🎮 *Antilink — Status (Discord)*",
        whatsapp: "📱 *Antilink — Status (WhatsApp)*",
        telegram: "✈️ *Antilink — Status (Telegram)*"
    };
    return heads[platform] || "🔗 *Antilink — Status*";
}
