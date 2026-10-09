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
} = require("../../../functions/antimediaHelper");
const { isOwner } = require("../../../functions/owners");
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
    name: "antimedia",
    category: "adm/segurança",
    description: `📹 Configura o bloqueio de tipos de mídia e as punições aplicadas neste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.

📍 1. Escolha o nível de configuração:
• Discord: server (servidor), categoria (categoria) ou chat (canal/tópico).
• WhatsApp: chat (grupo) ou server (comunidade, quando disponível).
• Telegram: server (grupo/canal) ou chat (tópico, quando disponível).

Os níveis disponíveis dependem da plataforma e do local em que o comando é usado.

📋 2. Configure os tipos de mídia bloqueados:
Adicione um ou mais tipos; novos tipos são somados aos já configurados. Use os nomes em inglês ou português:
image (imagem/foto), video (vídeo), audio (áudio/música), sticker (figurinha), location (localização), document (documento/arquivo), contact (contato), voice (mensagem de voz) e gif.

Adicionar:
{prefix}antimedia <nível> add <mídia1, mídia2>
{prefix}antimedia chat add image, video, sticker

Remover tipos:
{prefix}antimedia <nível> remove <mídia1, mídia2>
{prefix}antimedia chat remove sticker

Consultar os tipos configurados:
{prefix}antimedia <nível> list
{prefix}antimedia chat list

Se nenhum tipo estiver configurado, todos os tipos de mídia serão considerados bloqueados quando o antimedia estiver ativo.

⚙️ 3. Escolha a ação aplicada:
{prefix}antimedia <nível> action <delete|warn|kick|ban>
{prefix}antimedia chat action warn

delete remove a mídia; warn remove e avisa; kick remove e expulsa; ban remove e bane. As ações kick e ban exigem que o bot tenha permissão para moderar membros.

💬 Personalize o aviso enviado ao punir:
{prefix}antimedia <nível> message <texto>
{prefix}antimedia chat message Mídia não permitida aqui!

✅ 4. Ative ou desative a regra:
{prefix}antimedia <nível> on
{prefix}antimedia chat on
{prefix}antimedia <nível> off

🧩 Configure a herança:
{prefix}antimedia <nível> ignoreparent on
{prefix}antimedia <nível> ignoreparent off

Por padrão, o nível herda as regras dos níveis superiores. Use on para ignorá-las e off para voltar a herdá-las.

👤 5. Gerencie exceções por usuário:
Adicione ou remova usuários respondendo à mensagem, mencionando-os ou informando ID/número. Usuários na lista branca ficam isentos; usuários na lista negra são punidos ao enviar qualquer mídia, mesmo que o tipo não esteja configurado.
{prefix}antimedia <nível> userwhitelist add <usuário|ID>
{prefix}antimedia <nível> userwhitelist remove <usuário|ID>
{prefix}antimedia <nível> userwhitelist list
{prefix}antimedia <nível> userblacklist add <usuário|ID>
{prefix}antimedia <nível> userblacklist remove <usuário|ID>
{prefix}antimedia <nível> userblacklist list

No Discord, também é possível gerenciar exceções por cargo. Informe @cargo, ID ou nome:
{prefix}antimedia <nível> rolewhitelist add <@cargo|ID|nome>
{prefix}antimedia <nível> rolewhitelist remove <@cargo|ID|nome>
{prefix}antimedia <nível> rolewhitelist list
{prefix}antimedia <nível> roleblacklist add <@cargo|ID|nome>
{prefix}antimedia <nível> roleblacklist remove <@cargo|ID|nome>
{prefix}antimedia <nível> roleblacklist list

📊 Consulte o resumo das regras:
{prefix}antimedia status`,
    usage: "{prefix}antimedia",
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
        const userOk = isOwner(message) || (adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin);

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
            const newMsg = (message.getArgText ? message.getArgText(2) : args.slice(2).join(" ")).trim();
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

        // ── userwhitelist ───────────────────────────────────────────────
        if (subCmd === "userwhitelist" || subCmd === "uw") {
            const actionUw = (args[2] || "").toLowerCase();
            const current = getSetAntimedia(message, level);
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
                getSetAntimedia(message, level, { userWhitelist, userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} adicionado à lista branca em *${lbl}*.` });
            } else if (actionUw === "remove") {
                const idx = userWhitelist.findIndex(u => sameUserId(u, target.id));
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário ${target.mention} não está na lista branca.` });
                }
                userWhitelist.splice(idx, 1);
                getSetAntimedia(message, level, { userWhitelist });
                return message.reply({ text: `✅ Usuário ${target.mention} removido da lista branca em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antimedia <nivel> userwhitelist add|remove|list [usuário|@|ID]` });
        }

        // ── userblacklist ───────────────────────────────────────────────
        if (subCmd === "userblacklist" || subCmd === "ub") {
            const actionUb = (args[2] || "").toLowerCase();
            const current = getSetAntimedia(message, level);
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
                getSetAntimedia(message, level, { userWhitelist, userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} adicionado à lista negra em *${lbl}*.` });
            } else if (actionUb === "remove") {
                const idx = userBlacklist.findIndex(u => sameUserId(u, target.id));
                if (idx === -1) {
                    return message.reply({ text: `❌ O usuário ${target.mention} não está na lista negra.` });
                }
                userBlacklist.splice(idx, 1);
                getSetAntimedia(message, level, { userBlacklist });
                return message.reply({ text: `✅ Usuário ${target.mention} removido da lista negra em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antimedia <nivel> userblacklist add|remove|list [usuário|@|ID]` });
        }

        // ── rolewhitelist (Discord) ─────────────────────────────────────
        if (subCmd === "rolewhitelist" || subCmd === "rw") {
            if (message.platform !== "discord") {
                return message.reply({ text: "❌ A lista de cargos é exclusiva para servidores do Discord." });
            }
            const actionRw = (args[2] || "").toLowerCase();
            const current = getSetAntimedia(message, level);
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
                getSetAntimedia(message, level, { roleWhitelist, roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} adicionado à lista branca em *${lbl}*.` });
            } else if (actionRw === "remove") {
                const idx = roleWhitelist.indexOf(targetRole.id);
                if (idx === -1) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} não está na lista branca.` });
                }
                roleWhitelist.splice(idx, 1);
                getSetAntimedia(message, level, { roleWhitelist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} removido da lista branca em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antimedia <nivel> rolewhitelist add|remove|list [@Cargo|ID|Nome]` });
        }

        // ── roleblacklist (Discord) ─────────────────────────────────────
        if (subCmd === "roleblacklist" || subCmd === "rb") {
            if (message.platform !== "discord") {
                return message.reply({ text: "❌ A lista de cargos é exclusiva para servidores do Discord." });
            }
            const actionRb = (args[2] || "").toLowerCase();
            const current = getSetAntimedia(message, level);
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
                getSetAntimedia(message, level, { roleWhitelist, roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} adicionado à lista negra em *${lbl}*.` });
            } else if (actionRb === "remove") {
                const idx = roleBlacklist.indexOf(targetRole.id);
                if (idx === -1) {
                    return message.reply({ text: `❌ O cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} não está na lista negra.` });
                }
                roleBlacklist.splice(idx, 1);
                getSetAntimedia(message, level, { roleBlacklist });
                return message.reply({ text: `✅ Cargo ${formatRoleMention(targetRole.id, message.raw?.guild)} removido da lista negra em *${lbl}*.` });
            }

            return message.reply({ text: `❌ Use: ${message.prefix}antimedia <nivel> roleblacklist add|remove|list [@Cargo|ID|Nome]` });
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
    const mediaKinds = ['image','video','audio','sticker','location','document','contact','voice','gif'].join(', ');

    let header = '📹 *ANTIMEDIA — AJUDA*';
    if (plat === 'discord') header = '🎮 *ANTIMEDIA (Discord) — AJUDA*';
    else if (plat === 'whatsapp') header = '📱 *ANTIMEDIA (WhatsApp) — AJUDA*';
    else if (plat === 'telegram') header = '✈️ *ANTIMEDIA (Telegram) — AJUDA*';

    const lines = [];
    lines.push(header);
    lines.push('');
    lines.push('Níveis disponíveis aqui:');
    lines.push('  ' + levelList);
    lines.push('');
    lines.push('Descrição:');
    lines.push('Gerencia regras que bloqueiam tipos de mídia e aplica punições automáticas por nível (server/categoria/chat).');
    lines.push('');
    lines.push('⚙️ COMANDOS PRINCIPAIS:');
    lines.push('  • `' + p + 'antimedia status`');
    lines.push('    ↳ Exibe o status e configurações aplicadas nos níveis disponíveis.');
    lines.push('');
    lines.push('  • `' + p + 'antimedia <nivel> on|off`');
    lines.push('    ↳ Ativa ou desativa o antimedia no nível especificado.');
    lines.push('');
    lines.push('  • `' + p + 'antimedia <nivel> action <delete|warn|kick|ban>`');
    lines.push('    ↳ Define a punição automática. Ações fortes (kick/ban) exigem permissão do bot.');
    lines.push('');
    lines.push('  • `' + p + 'antimedia <nivel> message <texto...>`');
    lines.push('    ↳ Mensagem personalizada enviada ao punir.');
    lines.push('');
    lines.push('  • `' + p + 'antimedia <nivel> add <mídia,...>`');
    lines.push('    ↳ Adiciona tipos de mídia proibidos. Tipos válidos: ' + mediaKinds + '.');
    lines.push('');
    lines.push('  • `' + p + 'antimedia <nivel> remove <mídia,...>`');
    lines.push('    ↳ Remove tipos de mídia da lista proibida.');
    lines.push('');
    lines.push('  • `' + p + 'antimedia <nivel> list`');
    lines.push('    ↳ Lista as mídias atualmente proibidas neste nível.');
    lines.push('');
    lines.push('  • `' + p + 'antimedia <nivel> ignoreparent on|off`');
    lines.push('    ↳ Faz o nível atual ignorar (ou herdar) regras dos níveis superiores.');
    lines.push('');
    lines.push('  • `' + p + 'antimedia <nivel> userwhitelist add|remove|list <usuário|@|ID>`');
    lines.push('    ↳ Gerencia usuários isentos do bloqueio de mídia.');
    lines.push('');
    lines.push('  • `' + p + 'antimedia <nivel> userblacklist add|remove|list <usuário|@|ID>`');
    lines.push('    ↳ Gerencia usuários restritos no bloqueio de mídia.');
    lines.push('');
    if (plat === 'discord') {
        lines.push('  • `' + p + 'antimedia <nivel> rolewhitelist add|remove|list <@Cargo|ID|Nome>`');
        lines.push('    ↳ Gerencia cargos isentos do bloqueio de mídia.');
        lines.push('');
        lines.push('  • `' + p + 'antimedia <nivel> roleblacklist add|remove|list <@Cargo|ID|Nome>`');
        lines.push('    ↳ Gerencia cargos restritos no bloqueio de mídia.');
        lines.push('');
    }
    lines.push('🛡️ AÇÕES DISPONÍVEIS:');
    lines.push('  ' + actionsList);
    lines.push('');
    lines.push('💡 OBSERVAÇÕES:');
    lines.push('  • Algumas ações (kick/ban) exigem permissões administrativas do bot.');
    lines.push('  • Use `' + p + 'antimedia <nivel> action delete` para apenas remover a mídia sem ação adicional.');
    lines.push('  • As listas e configurações são específicas por nível.');
    lines.push('');
    lines.push('📌 EXEMPLOS:');
    lines.push('  ' + p + 'antimedia status');
    lines.push('  ' + p + 'antimedia chat on');
    lines.push('  ' + p + 'antimedia chat action warn');
    lines.push('  ' + p + 'antimedia chat add image, video, sticker');
    lines.push('  ' + p + 'antimedia chat userwhitelist add @Fulano');
    lines.push('  ' + p + 'antimedia chat message Mídia proibida aqui!');

    return lines.join('\n');
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
        const uwl = (cfg.userWhitelist || []).length ? `${cfg.userWhitelist.length} usuário(s)` : "0";
        const ubl = (cfg.userBlacklist || []).length ? `${cfg.userBlacklist.length} usuário(s)` : "0";
        lines.push(`  ${enabled ? "✅" : "❌"} ${label} (${level}) — Mídias: ${types} | WL: ${uwl} | BL: ${ubl}`);
    }

    return lines.join("\n");
}
