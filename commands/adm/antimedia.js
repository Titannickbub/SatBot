/*
=================================================================

COMANDO: !antimedia

Gerencia as regras de Antimedia por nível hierárquico.
Apenas administradores do chat podem usar.

Sub-comandos:
  !antimedia status
  !antimedia <nivel> on|off
  !antimedia <nivel> action delete|warn|kick|ban
  !antimedia <nivel> message <texto...>
  !antimedia <nivel> add <image, video, audio, sticker, location, document>
  !antimedia <nivel> remove <image, video, audio, sticker, location, document>
  !antimedia <nivel> list
  !antimedia <nivel> ignoreparent on|off
  !antimedia <nivel> userwhitelist add|remove|list <ID>

=================================================================
*/

const {
    getLevelLabel,
    getAvailableLevels,
    getSetAntimedia,
    normalizeMediaTypes
} = require("../../functions/antimediaHelper");

const ACTIONS = {
    delete: "🗑️ Deletar mensagem (silencioso)",
    warn:   "⚠️ Deletar + Avisar",
    kick:   "🚫 Deletar + Expulsar",
    ban:    "🔨 Deletar + Banir"
};

const STRONG_ACTIONS = ["kick", "ban"];

module.exports = {
    name: "antimedia",
    category: "adm",
    description: `Gerencia as regras de Antimedia por nível hierárquico. O antimedia bloqueia tipos de mídia e aplica punições.
Funções disponíveis:
• on/off: Ativa ou desativa o antimedia no nível especificado.
• action <delete|warn|kick|ban>: Define a punição.
• message <texto>: Define uma mensagem de aviso personalizada ao punir.
• add <mídia, outra, ...>: Adiciona tipos de mídia proibidos (image, video, audio, sticker, location, document, contact, voice, gif).
• remove <mídia>: Remove tipos de mídia da lista proibida.
• list: Mostra as mídias proibidas no nível.
• ignoreparent <on|off>: Define se o nível atual ignora configurações de níveis superiores.`,
    usage: "{prefix}antimedia]",
    examples: [
        "{prefix}antimedia status",
        "{prefix}antimedia chat on",
        "{prefix}antimedia chat action warn",
        "{prefix}antimedia chat add image, video, audio",
        "{prefix}antimedia chat remove sticker",
        "{prefix}antimedia chat list",
        "{prefix}antimedia chat ignoreparent on"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos/servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores podem configurar o antimedia." });
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
                const current = getSetAntimedia(message, level);
                const action = current?.action || "delete";
                if (STRONG_ACTIONS.includes(action)) {
                    const botOk = adapter?.checkBotPermission
                        ? await adapter.checkBotPermission(message.chatId, action)
                        : false;
                    if (!botOk) {
                        return message.reply({
                            text: `⚠️ O bot não tem permissão para executar a ação *${action}*\nConceda as permissões de administrador e tente novamente, ou altere a ação com:\n  ${message.prefix}antimedia ${level} action delete`
                        });
                    }
                }
            }
            getSetAntimedia(message, level, { enabled: enabling });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: enabling ? `✅ Antimedia ativado no nível *${lbl}*.` : `🔕 Antimedia desativado no nível *${lbl}*.` });
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
            getSetAntimedia(message, level, { action: newAction });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Ação do antimedia no nível *${lbl}* alterada para *${newAction}*.\n${ACTIONS[newAction]}` });
        }

        if (subCmd === "message") {
            const newMsg = args.slice(2).join(" ").trim();
            if (!newMsg) {
                return message.reply({ text: "❌ Informe a mensagem. Ex: !antimedia chat message Mídia proibida aqui!" });
            }
            getSetAntimedia(message, level, { message: newMsg });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Mensagem do antimedia no nível *${lbl}* atualizada:\n"${newMsg}"` });
        }

        if (subCmd === "add") {
            const media = normalizeMediaTypes(args.slice(2).join(" "));
            if (!media.length) {
                return message.reply({ text: "❌ Informe uma ou mais mídias. Ex: !antimedia chat add image, video, audio" });
            }
            const current = getSetAntimedia(message, level) || {};
            const merged = Array.from(new Set([...(current.mediaTypes || []), ...media]));
            getSetAntimedia(message, level, { mediaTypes: merged });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Mídias adicionadas no nível *${lbl}*:\n${merged.join(", ")}` });
        }

        if (subCmd === "remove") {
            const media = normalizeMediaTypes(args.slice(2).join(" "));
            if (!media.length) {
                return message.reply({ text: "❌ Informe as mídias a remover. Ex: !antimedia chat remove sticker, location" });
            }
            const current = getSetAntimedia(message, level) || {};
            const remaining = (current.mediaTypes || []).filter(type => !media.includes(type));
            getSetAntimedia(message, level, { mediaTypes: remaining });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Mídias removidas do nível *${lbl}*.` });
        }

        if (subCmd === "list") {
            const current = getSetAntimedia(message, level) || {};
            const types = (current.mediaTypes || []).length ? current.mediaTypes.join(", ") : "(nenhuma)";
            return message.reply({ text: `📋 Mídias cadastradas:\n${types}` });
        }

        if (subCmd === "ignoreparent") {
            const val = (args[2] || "").toLowerCase();
            if (val !== "on" && val !== "off") {
                return message.reply({ text: "❌ Use: !antimedia <nivel> ignoreparent on|off" });
            }
            const ignoring = val === "on";
            getSetAntimedia(message, level, { ignoreParent: ignoring });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: ignoring ? `✅ *${lbl}* agora ignora as regras dos níveis superiores.` : `✅ *${lbl}* agora herda as regras dos níveis superiores.` });
        }

        if (subCmd === "userwhitelist") {
            const actionUw = (args[2] || "").toLowerCase();
            const current = getSetAntimedia(message, level);
            const userWhitelist = Array.isArray(current?.userWhitelist) ? [...current.userWhitelist] : [];
            const lbl = getLevelLabel(message.platform, level);

            if (actionUw === "list") {
                return message.reply({
                    text: userWhitelist.length
                        ? `👤 Usuários na lista branca em *${lbl}*:\n${userWhitelist.map(u => `- ${u}`).join("\n")}`
                        : `🔕 Nenhum usuário na lista branca em *${lbl}*.`
                });
            }

            const userId = args[3] ? String(args[3]).trim() : null;
            if (!userId && (actionUw === "add" || actionUw === "remove")) {
                return message.reply({ text: "❌ Informe o ID do usuário. Ex: !antimedia <nivel> userwhitelist add 5511999990000" });
            }

            if (actionUw === "add") {
                if (userWhitelist.includes(userId)) {
                    return message.reply({ text: `❌ O usuário *${userId}* já está na lista branca.` });
                }
                userWhitelist.push(userId);
                getSetAntimedia(message, level, { userWhitelist });
                return message.reply({ text: `✅ Usuário *${userId}* adicionado à lista branca em *${lbl}*.` });
            } else if (actionUw === "remove") {
                const idx = userWhitelist.indexOf(userId);
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário *${userId}* não está na lista branca.` });
                }
                userWhitelist.splice(idx, 1);
                getSetAntimedia(message, level, { userWhitelist });
                return message.reply({ text: `✅ Usuário *${userId}* removido da lista branca em *${lbl}*.` });
            }

            return message.reply({ text: "❌ Use: !antimedia <nivel> userwhitelist add|remove|list [ID]" });
        }

        return message.reply({ text: _help(message) });
    }
};

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;
    const lvls = getAvailableLevels(message);
    const levelList = lvls.map(l => `*${l}* (${getLevelLabel(plat, l)})`).join(" | ");

    return (
`📹 *Antimedia — Ajuda*

Níveis disponíveis aqui:
  ${levelList}

Comandos:
  ${p}antimedia status
  ${p}antimedia <nivel> on|off
  ${p}antimedia <nivel> action delete|warn|kick|ban
  ${p}antimedia <nivel> message <texto...>
  ${p}antimedia <nivel> add <image, video, audio, sticker, location, document>
  ${p}antimedia <nivel> remove <image, video, audio, sticker, location, document>
  ${p}antimedia <nivel> list
  ${p}antimedia <nivel> ignoreparent on|off
  ${p}antimedia <nivel> userwhitelist add|remove|list <ID>

Exemplos:
  ${p}antimedia server on
  ${p}antimedia chat action warn
  ${p}antimedia chat add image, video, sticker
  ${p}antimedia chat message Mídia proibida aqui!`
    );
}

async function _status(message, adapter) {
    const platform = message.platform;
    const available = getAvailableLevels(message);
    const active = [];

    for (const level of available) {
        const cfg = getSetAntimedia(message, level);
        if (cfg?.enabled) {
            active.push({ level, cfg });
        }
    }

    const final = active.length
        ? `✅ Nível ativo: *${getLevelLabel(platform, active[active.length - 1].level)}* (${active[active.length - 1].level})`
        : "❌ Nenhum nível ativo";

    const lines = [
        "📹 Antimedia - Resumo do chat atual:",
        final,
        "",
        "Níveis disponíveis:"
    ];

    for (const level of available) {
        const cfg = getSetAntimedia(message, level) || {};
        const enabled = cfg.enabled === true;
        const label = getLevelLabel(platform, level);
        const types = (cfg.mediaTypes || []).length ? cfg.mediaTypes.join(", ") : "(nenhuma)";
        lines.push(`  ${enabled ? "✅" : "❌"} ${label} (${level}) — ${types}`);
    }

    return lines.join("\n");
}
