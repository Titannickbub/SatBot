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
} = require("../../functions/antilinkHelper");

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
    category: "adm",
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
        const userOk  = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;

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
            const newMsg = args.slice(2).join(" ").trim();
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
        if (subCmd === "userwhitelist") {
            const actionUw = (args[2] || "").toLowerCase(); // add, remove, list
            const current = getSetAntilink(message, level);
            const userWhitelist = Array.isArray(current?.userWhitelist) ? [...current.userWhitelist] : [];
            const lbl = getLevelLabel(platform, level);

            if (actionUw === "list") {
                return message.reply({
                    text: userWhitelist.length
                        ? `👤 Usuários na lista branca em *${lbl}*:\n${userWhitelist.map(u => `- ${u}`).join("\n")}`
                        : `🔕 Nenhum usuário na lista branca em *${lbl}*.`
                });
            }

            const userId = args[3] ? String(args[3]).trim() : null;
            if (!userId && (actionUw === "add" || actionUw === "remove")) {
                return message.reply({ text: "❌ Informe o ID do usuário. Ex: !antilink <nivel> userwhitelist add 5511999990000" });
            }

            if (actionUw === "add") {
                if (userWhitelist.includes(userId)) {
                    return message.reply({ text: `❌ O usuário *${userId}* já está na lista branca.` });
                }
                userWhitelist.push(userId);
                getSetAntilink(message, level, { userWhitelist });
                return message.reply({ text: `✅ Usuário *${userId}* adicionado à lista branca em *${lbl}*.` });
            } else if (actionUw === "remove") {
                const idx = userWhitelist.indexOf(userId);
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário *${userId}* não está na lista branca.` });
                }
                userWhitelist.splice(idx, 1);
                getSetAntilink(message, level, { userWhitelist });
                return message.reply({ text: `✅ Usuário *${userId}* removido da lista branca em *${lbl}*.` });
            }

            return message.reply({ text: "❌ Use: !antilink <nivel> userwhitelist add|remove|list [ID]" });
        }

        // ── Fallback: ajuda ─────────────────────────────────────────────
        return message.reply({ text: _help(message) });
    }
};

// ─────────────────────────────────────────────────────────────
//  HELPERS DE RESPOSTA
// ─────────────────────────────────────────────────────────────

function _help(message) {
    const p   = message.prefix;
    const plat = message.platform;
    const lvls = getAvailableLevels(message);
    const levelList = lvls.map(l => `*${l}* (${getLevelLabel(plat, l)})`).join(" | ");

    return (
`🔗 *Antilink — Ajuda*

Níveis disponíveis aqui:
  ${levelList}

Comandos:
  ${p}antilink status
  ${p}antilink <nivel> on|off
  ${p}antilink <nivel> action delete|warn|kick|ban
  ${p}antilink <nivel> message <texto...>
  ${p}antilink <nivel> ignoreparent on|off
  ${p}antilink <nivel> ignoresame on|off
  ${p}antilink <nivel> ignoremedia on|off
  ${p}antilink <nivel> whitelist add|remove|list <link>
  ${p}antilink <nivel> userwhitelist add|remove|list <ID>

Exemplos:
  ${p}antilink server on
  ${p}antilink chat action warn
  ${p}antilink chat message Links proibidos!
  ${p}antilink chat ignoreparent on
  ${p}antilink chat whitelist add youtube.com
  ${p}antilink chat userwhitelist add 5511999990000`
    );
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
