/*
=================================================================

COMANDO: !antipalavras

Gerencia as regras de Antipalavras por nível hierárquico.
Apenas administradores do chat podem usar.

Sub-comandos:
  !antipalavras status
  !antipalavras <nivel> on|off
  !antipalavras <nivel> action delete|warn|kick|ban
  !antipalavras <nivel> message <texto...>
  !antipalavras <nivel> add <palavra1, palavra2, frase>
  !antipalavras <nivel> remove <palavra1, palavra2, frase>
  !antipalavras <nivel> list
  !antipalavras <nivel> ignoreparent on|off

=================================================================
*/

const {
    getLevelLabel,
    getAvailableLevels,
    getSetAntipalavras,
    normalizeWords
} = require("../../../functions/antipalavrasHelper");
const {
    resolveTargetUser,
    resolveTargetRole,
    formatRoleMention,
    formatUserMention,
    sameUserId
} = require("../../../functions/antiHelper");

const ACTIONS = {
    delete: "🗑️ Deletar mensagem (silencioso)",
    warn:   "⚠️ Deletar + Avisar",
    kick:   "🚫 Deletar + Expulsar",
    ban:    "🔨 Deletar + Banir"
};

const STRONG_ACTIONS = ["kick", "ban"];

module.exports = {
    name: "antipalavras",
    category: "adm/segurança",
    description: `Gerencia as regras de Antipalavras por nível hierárquico. O antipalavras deleta mensagens que contenham palavras proibidas e aplica punições.
Funções disponíveis:
• on/off: Ativa ou desativa o antipalavras no nível especificado.
• action <delete|warn|kick|ban>: Define a punição (deletar, avisar, expulsar ou banir).
• message <texto>: Define uma mensagem de aviso personalizada ao punir.
• add <palavra, frase>: Adiciona novas palavras ou frases à lista de proibidas (separadas por vírgula).
• remove <palavra, frase>: Remove palavras ou frases da lista de proibidas.
• list: Mostra todas as palavras e frases atualmente proibidas no nível.
• ignoreparent <on|off>: Define se o nível atual ignora configurações de níveis superiores.`,
    usage: "{prefix}antipalavras",
    examples: [
        "{prefix}antipalavras status",
        "{prefix}antipalavras chat on",
        "{prefix}antipalavras chat action warn",
        "{prefix}antipalavras chat add palavra1, xingamento, frase ruim",
        "{prefix}antipalavras chat remove palavra1",
        "{prefix}antipalavras chat list",
        "{prefix}antipalavras chat ignoreparent on"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos/servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk  = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores podem configurar o antipalavras." });
        }

        const args = message.args || [];
        if (!args.length) {
            return message.reply({ text: _help(message) });
        }

        const first = args[0].toLowerCase();
        if (first === "status") {
            return message.reply({ text: await _status(message, adapter) });
        }

        const level = first;
        const available = getAvailableLevels(message);

        if (!available.includes(level)) {
            const list = available.map(l => `*${l}* (${getLevelLabel(message.platform, l)})`).join("\n  ");
            return message.reply({ text: `❌ Nível *${level}* não disponível aqui.\n\nNíveis disponíveis:\n  ${list}` });
        }

        const subCmd = (args[1] || "").toLowerCase();

        if (subCmd === "on" || subCmd === "off") {
            const enabling = subCmd === "on";
            if (enabling) {
                const current = getSetAntipalavras(message, level);
                const action = current?.action || "delete";
                if (STRONG_ACTIONS.includes(action)) {
                    const botOk = adapter?.checkBotPermission
                        ? await adapter.checkBotPermission(message.chatId, action)
                        : false;
                    if (!botOk) {
                        return message.reply({
                            text: `⚠️ O bot não tem permissão para executar a ação *${action}*.\nConceda as permissões de administrador e tente novamente, ou altere a ação com:\n  ${message.prefix}antipalavras ${level} action delete`
                        });
                    }
                }
            }
            getSetAntipalavras(message, level, { enabled: enabling });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: enabling ? `✅ Antipalavras ativado no nível *${lbl}*.` : `🔕 Antipalavras desativado no nível *${lbl}*.` });
        }

        if (subCmd === "action") {
            const newAction = (args[2] || "").toLowerCase();
            if (!ACTIONS[newAction]) {
                const list = Object.entries(ACTIONS).map(([k, v]) => `  *${k}* — ${v}`).join("\n");
                return message.reply({ text: `❌ Ação inválida.\n\nAções disponíveis:\n${list}` });
            }
            if (STRONG_ACTIONS.includes(newAction)) {
                const botOk = adapter?.checkBotPermission ? await adapter.checkBotPermission(message.chatId, newAction) : false;
                if (!botOk) {
                    return message.reply({ text: `⚠️ O bot não tem permissão para executar *${newAction}* neste chat.\nConceda permissões de administrador primeiro.` });
                }
            }
            getSetAntipalavras(message, level, { action: newAction });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Ação do antipalavras no nível *${lbl}* alterada para *${newAction}*.\n${ACTIONS[newAction]}` });
        }

        if (subCmd === "message") {
            const newMsg = (message.getArgText ? message.getArgText(2) : args.slice(2).join(" ")).trim();
            if (!newMsg) {
                return message.reply({ text: "❌ Informe a mensagem. Ex: !antipalavras chat message Palavras ofensivas não são permitidas!" });
            }
            getSetAntipalavras(message, level, { message: newMsg });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Mensagem do antipalavras no nível *${lbl}* atualizada:\n"${newMsg}"` });
        }

        if (subCmd === "add") {
            const words = normalizeWords(args.slice(2).join(" "));
            if (!words.length) {
                return message.reply({ text: "❌ Informe uma ou mais palavras/frases. Ex: !antipalavras chat add palavra, outra, frase proibida" });
            }
            const current = getSetAntipalavras(message, level) || {};
            const merged = Array.from(new Set([...(current.words || []), ...words]));
            getSetAntipalavras(message, level, { words: merged });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Palavras/frases adicionadas no nível *${lbl}*:\n${merged.join(", ")}` });
        }

        if (subCmd === "remove") {
            const words = normalizeWords(args.slice(2).join(" "));
            if (!words.length) {
                return message.reply({ text: "❌ Informe as palavras/frases a remover. Ex: !antipalavras chat remove palavra, outra" });
            }
            const current = getSetAntipalavras(message, level) || {};
            const remaining = (current.words || []).filter(w => !words.includes(w));
            getSetAntipalavras(message, level, { words: remaining });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Palavras/frases removidas do nível *${lbl}*.` });
        }

        if (subCmd === "list") {
            const current = getSetAntipalavras(message, level) || {};
            const words = (current.words || []).length ? current.words.join(", ") : "(nenhuma)";
            return message.reply({ text: `📋 Palavras/frases cadastradas:\n${words}` });
        }

        if (subCmd === "ignoreparent") {
            const val = (args[2] || "").toLowerCase();
            if (val !== "on" && val !== "off") {
                return message.reply({ text: "❌ Use: !antipalavras <nivel> ignoreparent on|off" });
            }
            const ignoring = val === "on";
            getSetAntipalavras(message, level, { ignoreParent: ignoring });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: ignoring ? `✅ *${lbl}* agora ignora as regras dos níveis superiores.` : `✅ *${lbl}* agora herda as regras dos níveis superiores.` });
        }

        // ── userwhitelist ───────────────────────────────────────────────
        if (subCmd === "userwhitelist" || subCmd === "uw") {
            const actionUw = (args[2] || "").toLowerCase(); // add, remove, list
            const current = getSetAntipalavras(message, level);
            const userWhitelist = Array.isArray(current?.userWhitelist) ? [...current.userWhitelist] : [];
            const lbl = getLevelLabel(message.platform, level);

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
                getSetAntipalavras(message, level, { userWhitelist, userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} adicionado à lista branca em *${lbl}*.` });
            } else if (actionUw === "remove") {
                const idx = userWhitelist.findIndex(u => sameUserId(u, target.id));
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário ${target.mention} não está na lista branca.` });
                }
                userWhitelist.splice(idx, 1);
                getSetAntipalavras(message, level, { userWhitelist });
                return message.reply({ text: `✅ Usuário ${target.mention} removido da lista branca em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antipalavras <nivel> userwhitelist add|remove|list [usuário|@|ID]` });
        }

        // ── userblacklist ───────────────────────────────────────────────
        if (subCmd === "userblacklist" || subCmd === "ub") {
            const actionUb = (args[2] || "").toLowerCase(); // add, remove, list
            const current = getSetAntipalavras(message, level);
            const userBlacklist = Array.isArray(current?.userBlacklist) ? [...current.userBlacklist] : [];
            const lbl = getLevelLabel(message.platform, level);

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
                getSetAntipalavras(message, level, { userWhitelist, userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} adicionado à lista negra em *${lbl}*.` });
            } else if (actionUb === "remove") {
                const idx = userBlacklist.findIndex(u => sameUserId(u, target.id));
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário ${target.mention} não está na lista negra.` });
                }
                userBlacklist.splice(idx, 1);
                getSetAntipalavras(message, level, { userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} removido da lista negra em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antipalavras <nivel> userblacklist add|remove|list [usuário|@|ID]` });
        }

        // ── rolewhitelist (Discord) ─────────────────────────────────────
        if (subCmd === "rolewhitelist" || subCmd === "rw") {
            if (message.platform !== "discord") {
                return message.reply({ text: "❌ A lista de cargos é exclusiva para servidores do Discord." });
            }
            const actionRw = (args[2] || "").toLowerCase();
            const current = getSetAntipalavras(message, level);
            const roleWhitelist = Array.isArray(current?.roleWhitelist) ? [...current.roleWhitelist] : [];
            const lbl = getLevelLabel(message.platform, level);

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
                getSetAntipalavras(message, level, { roleWhitelist, roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} adicionado à lista branca em *${lbl}*.` });
            } else if (actionRw === "remove") {
                const idx = roleWhitelist.indexOf(targetRole.id);
                if (idx === -1) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} não está na lista branca.` });
                }
                roleWhitelist.splice(idx, 1);
                getSetAntipalavras(message, level, { roleWhitelist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} removido da lista branca em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antipalavras <nivel> rolewhitelist add|remove|list [@Cargo|ID|Nome]` });
        }

        // ── roleblacklist (Discord) ─────────────────────────────────────
        if (subCmd === "roleblacklist" || subCmd === "rb") {
            if (message.platform !== "discord") {
                return message.reply({ text: "❌ A lista de cargos é exclusiva para servidores do Discord." });
            }
            const actionRb = (args[2] || "").toLowerCase();
            const current = getSetAntipalavras(message, level);
            const roleBlacklist = Array.isArray(current?.roleBlacklist) ? [...current.roleBlacklist] : [];
            const lbl = getLevelLabel(message.platform, level);

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
                getSetAntipalavras(message, level, { roleWhitelist, roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} adicionado à lista negra em *${lbl}*.` });
            } else if (actionRb === "remove") {
                const idx = roleBlacklist.indexOf(targetRole.id);
                if (idx === -1) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} não está na lista negra.` });
                }
                roleBlacklist.splice(idx, 1);
                getSetAntipalavras(message, level, { roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} removido da lista negra em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antipalavras <nivel> roleblacklist add|remove|list [@Cargo|ID|Nome]` });
        }

        return message.reply({ text: _help(message) });
    }
};

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;
    const lvls = getAvailableLevels(message);
    const levelList = lvls.map(l => `*${l}* (${getLevelLabel(plat, l)})`).join(" | ");

    const actionsList = Object.entries(ACTIONS).map(([k, v]) => `• \`${k}\` — ${v}`).join("\n  ");

    let header = '⚠️ *ANTIPALAVRAS — AJUDA*';
    if (plat === 'discord') header = '🎮 *ANTIPALAVRAS (Discord) — AJUDA*';
    else if (plat === 'whatsapp') header = '📱 *ANTIPALAVRAS (WhatsApp) — AJUDA*';
    else if (plat === 'telegram') header = '✈️ *ANTIPALAVRAS (Telegram) — AJUDA*';

    const lines = [];
    lines.push(header);
    lines.push('');
    lines.push('Gerencie a filtragem automática de palavras e frases proibidas por nível.');
    lines.push('');
    lines.push('📋 Níveis disponíveis:');
    lines.push('  ' + levelList);
    lines.push('');
    lines.push('⚙️ COMANDOS DISPONÍVEIS:');
    lines.push('  `' + p + 'antipalavras status`');
    lines.push('    ↳ Exibe as configurações e estado por nível.');
    lines.push('');
    lines.push('  `' + p + 'antipalavras <nivel> on|off`');
    lines.push('    ↳ Ativa ou desativa o antipalavras no nível especificado.');
    lines.push('');
    lines.push('  `' + p + 'antipalavras <nivel> action <delete|warn|kick|ban>`');
    lines.push('    ↳ Define a punição aplicada quando uma palavra proibida for detectada.');
    lines.push('');
    lines.push('  `' + p + 'antipalavras <nivel> message <texto...>`');
    lines.push('    ↳ Define uma mensagem personalizada enviada ao punir.');
    lines.push('');
    lines.push('  `' + p + 'antipalavras <nivel> add <palavra, outra, frase>`');
    lines.push('    ↳ Adiciona palavras ou frases à lista proibida (separadas por vírgula).');
    lines.push('');
    lines.push('  `' + p + 'antipalavras <nivel> remove <palavra, outra>`');
    lines.push('    ↳ Remove itens da lista proibida.');
    lines.push('');
    lines.push('  `' + p + 'antipalavras <nivel> list`');
    lines.push('    ↳ Lista as palavras e frases proibidas neste nível.');
    lines.push('');
    lines.push('  `' + p + 'antipalavras <nivel> ignoreparent on|off`');
    lines.push('    ↳ Define se o nível atual ignora regras de níveis superiores.');
    lines.push('');
    lines.push('  `' + p + 'antipalavras <nivel> userwhitelist add|remove|list <usuário|@|ID>`');
    lines.push('    ↳ Gerencia usuários isentos do filtro.');
    lines.push('');
    lines.push('  `' + p + 'antipalavras <nivel> userblacklist add|remove|list <usuário|@|ID>`');
    lines.push('    ↳ Gerencia usuários restritos no filtro.');
    lines.push('');
    if (plat === 'discord') {
        lines.push('  `' + p + 'antipalavras <nivel> rolewhitelist add|remove|list <@Cargo|ID|Nome>`');
        lines.push('    ↳ Gerencia cargos isentos do filtro.');
        lines.push('');
        lines.push('  `' + p + 'antipalavras <nivel> roleblacklist add|remove|list <@Cargo|ID|Nome>`');
        lines.push('    ↳ Gerencia cargos restritos no filtro.');
        lines.push('');
    }
    lines.push('🛡️ AÇÕES DISPONÍVEIS:');
    lines.push('  ' + actionsList);
    lines.push('');
    lines.push('💡 OBSERVAÇÕES:');
    lines.push('  • Use `'+p+'antipalavras <nivel> action delete` para apenas remover mensagens sem notificar.');
    lines.push('  • As listas são específicas por nível e podem herdar regras de níveis superiores, a menos que ignoreparent esteja ativado.');
    lines.push('');
    lines.push('📌 EXEMPLOS:');
    lines.push('  ' + p + 'antipalavras server on');
    lines.push('  ' + p + 'antipalavras chat add palavra, xingamento, frase ruim');
    lines.push('  ' + p + 'antipalavras chat action warn');
    lines.push('  ' + p + 'antipalavras chat userwhitelist add @Fulano');

    return lines.join('\n');
}

async function _status(message, adapter) {
    const platform = message.platform;
    const available = getAvailableLevels(message);
    const lines = [];

    for (const level of available) {
        const lbl = getLevelLabel(platform, level);
        const cfg = getSetAntipalavras(message, level) || {};
        const statusIcon = cfg.enabled ? "✅ Ativo" : "🔕 Inativo";
        const actionTxt = cfg.action || "delete";
        const msgTxt = cfg.message ? `"${cfg.message}"` : "(padrão)";
        const ipTxt = cfg.ignoreParent ? "✅ Sim" : "❌ Não";
        const wordsTxt = (cfg.words || []).length ? cfg.words.join(", ") : "(nenhuma)";
        const uwlTxt = (cfg.userWhitelist && cfg.userWhitelist.length) ? cfg.userWhitelist.join(", ") : "Nenhum";
        const ublTxt = (cfg.userBlacklist && cfg.userBlacklist.length) ? cfg.userBlacklist.join(", ") : "Nenhum";
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
  Palavras:     ${wordsTxt}
  IgnorarSuperior: ${ipTxt}
  UsuáriosBrancos: ${uwlTxt}
  UsuáriosNegros:  ${ublTxt}${botPermTxt}`
        );
    }

    return `${_platformHeader(platform)}\n\n${lines.join("\n\n")}`;
}

function _platformHeader(platform) {
    const heads = {
        discord: "🎮 *Antipalavras — Status (Discord)*",
        whatsapp: "📱 *Antipalavras — Status (WhatsApp)*",
        telegram: "✈️ *Antipalavras — Status (Telegram)*"
    };
    return heads[platform] || "⚠️ *Antipalavras — Status*";
}
