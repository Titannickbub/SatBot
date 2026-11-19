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
    ALL_MEDIA_TYPES,
    getLevelLabel,
    getAvailableLevels,
    getSetAntimedia,
    normalizeMediaTypes,
    readAntimedia
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
const ACTION_BUTTON_LABELS = {
    delete: "🗑 Deletar",
    warn: "⚠️ Avisar",
    kick: "🚫 Expulsar",
    ban: "🔨 Banir"
};
const MEDIA_TYPE_LABELS = {
    image: "Imagens",
    video: "Vídeos",
    audio: "Áudios",
    sticker: "Figurinhas",
    location: "Localização",
    document: "Documentos",
    contact: "Contatos",
    voice: "Mensagens de voz",
    gif: "GIFs"
};
const TOGGLE_FIELDS = {
    enabled: "enabled",
    ignoreParent: "ignoreParent"
};

module.exports = {
    name: "antimedia",
    category: "adm/segurança",
    description: `📹 Configura o bloqueio de tipos de mídia e as punições aplicadas neste grupo ou servidor.

Sem argumentos, abre o menu de configuração. Use os controles para bloquear ou permitir mídias; mensagem personalizada e listas de usuários/cargos continuam usando comandos de texto.

🔐 Disponível para administradores do chat e superusuários.

📍 1. Escolha o nível de configuração:
• Discord: server (servidor), categoria (categoria) ou chat (canal/tópico).
• WhatsApp: chat (grupo) ou server (comunidade, quando disponível).
• Telegram: server (grupo/canal) ou chat (tópico, quando disponível).

Os níveis disponíveis dependem da plataforma e do local em que o comando é usado.
Se omitir o nível, a alteração será aplicada somente ao chat atual.

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
        "{prefix}antimedia",
        "{prefix}antimedia help",
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

        const inputArgs = message.args || [];
        if (!inputArgs.length) {
            if (message.platform === "whatsapp") {
                return message.reply({ text: _whatsappSummary(message) });
            }
            const levels = getAvailableLevels(message);
            const selectedLevel = levels.includes("chat") ? "chat" : levels[0];
            if (!selectedLevel) {
                return message.reply({ text: "❌ Não há escopos de antimedia disponíveis neste chat." });
            }
            return message.reply(_configurationMenu(message, selectedLevel));
        }

        const first = inputArgs[0].toLowerCase();
        if (first === "help" || first === "ajuda") {
            return message.reply({ text: _help(message) });
        }
        if (first === "status") {
            return message.reply({ text: await _status(message, adapter) });
        }

        const hasExplicitLevel = ["server", "categoria", "chat"].includes(first);
        const args = hasExplicitLevel ? inputArgs : ["chat", ...inputArgs];
        const level = args[0].toLowerCase();
        const available = getAvailableLevels(message);
        const telegramChatFallback = message.platform === "telegram" && level === "chat" && !message.threadId;

        if (!available.includes(level) && !telegramChatFallback) {
            const list = available.map(l => `*${l}* (${getLevelLabel(message.platform, l)})`).join("\n  ");
            return message.reply({ text: `❌ Nível *${level}* não disponível aqui.\n\nNíveis disponíveis:\n  ${list}` });
        }

        const subCmd = (args[1] || "").toLowerCase();
        const argumentOffset = hasExplicitLevel ? 0 : 1;

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
            const newMsg = (message.getArgText ? message.getArgText(2 - argumentOffset) : args.slice(2).join(" ")).trim();
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
            const merged = Array.from(new Set([..._getBlockedMediaTypes(current), ...media]));
            getSetAntimedia(message, level, { mediaTypes: merged, allowAllMedia: false });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Mídias adicionadas no nível *${lbl}*:\n${merged.join(", ")}` });
        }

        if (subCmd === "remove") {
            const media = normalizeMediaTypes(args.slice(2).join(" "));
            if (!media.length) {
                return message.reply({ text: "❌ Informe as mídias a remover. Ex: !antimedia chat remove sticker, location" });
            }
            const current = getSetAntimedia(message, level) || {};
            const remaining = _getBlockedMediaTypes(current).filter(type => !media.includes(type));
            const allowAllMedia = remaining.length === 0;
            getSetAntimedia(message, level, { mediaTypes: remaining, allowAllMedia });
            const lbl = getLevelLabel(message.platform, level);
            return message.reply({ text: `✅ Mídias removidas do nível *${lbl}*.` });
        }

        if (subCmd === "list") {
            const current = getSetAntimedia(message, level) || {};
            const types = _mediaTypesStatus(current);
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
    },

    async handleInteraction(interaction) {
        return _handleConfigurationInteraction(interaction);
    }
};

function _getAdapter(message) {
    return (message.platforms || []).find(platform => platform.name === message.platform) ||
        global.platformRegistry?.[message.platform];
}

function _configurationMenu(message, selectedLevel) {
    const levels = getAvailableLevels(message);
    if (!levels.includes(selectedLevel)) {
        return { text: "❌ Esse escopo não está disponível neste chat." };
    }

    const config = getSetAntimedia(message, selectedLevel) || readAntimedia(null);
    const prefix = message.prefix || "!";
    const levelLabel = getLevelLabel(message.platform, selectedLevel);

    if (message.platform === "discord") {
        const {
            ActionRowBuilder,
            ButtonBuilder,
            ButtonStyle,
            EmbedBuilder,
            StringSelectMenuBuilder
        } = require("discord.js");
        const scopeRow = new ActionRowBuilder().addComponents(
            ...levels.map(level => new ButtonBuilder()
                .setCustomId(`antimedia:scope:${level}:${selectedLevel}`)
                .setLabel(_scopeButtonLabel(message.platform, level, selectedLevel))
                .setStyle(level === selectedLevel ? ButtonStyle.Primary : ButtonStyle.Secondary))
        );
        const actionMenu = new StringSelectMenuBuilder()
            .setCustomId(`antimedia:action:${selectedLevel}`)
            .setPlaceholder(`Ação atual: ${config.action}`)
            .addOptions(Object.entries(ACTIONS).map(([value, description]) => ({
                label: value,
                description: description.replace(/^[^\w]+/u, "").slice(0, 100),
                value
            })));
        const actionRow = new ActionRowBuilder().addComponents(actionMenu);
        const toggles = _getToggleButtons(selectedLevel, config, ButtonBuilder, ButtonStyle);
        const blockedTypes = _getBlockedMediaTypes(config);
        const mediaMenu = new StringSelectMenuBuilder()
            .setCustomId(`antimedia:media:${selectedLevel}`)
            .setPlaceholder("Selecione as mídias que serão bloqueadas")
            .setMinValues(1)
            .setMaxValues(ALL_MEDIA_TYPES.length)
            .addOptions(ALL_MEDIA_TYPES.map(type => ({
                label: `${MEDIA_TYPE_LABELS[type]} (${type})`,
                description: blockedTypes.includes(type) ? "Atualmente bloqueada" : "Atualmente permitida",
                value: type,
                default: blockedTypes.includes(type)
            })));
        const mediaRow = new ActionRowBuilder().addComponents(mediaMenu);
        const mediaActionsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`antimedia:media:${selectedLevel}:blockall`)
                .setLabel("Bloquear todas")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`antimedia:media:${selectedLevel}:allowall`)
                .setLabel("Permitir todas")
                .setStyle(ButtonStyle.Success)
        );
        const components = [scopeRow, actionRow];
        if (toggles.length) components.push(new ActionRowBuilder().addComponents(...toggles));
        components.push(mediaRow, mediaActionsRow);
        return {
            embed: _discordMenuEmbed(config, selectedLevel, levelLabel, prefix, EmbedBuilder),
            components
        };
    }

    if (message.platform === "telegram") {
        const blockedTypes = _getBlockedMediaTypes(config);
        const inline_keyboard = [
            levels.map(level => ({
                text: _scopeButtonLabel(message.platform, level, selectedLevel),
                callback_data: `antimedia:scope:${level}:${selectedLevel}`
            })),
            [
                _telegramToggleButton(selectedLevel, "enabled", config),
                ...(selectedLevel === "server" ? [] : [_telegramToggleButton(selectedLevel, "ignoreParent", config)])
            ],
            ...Object.entries(ACTION_BUTTON_LABELS).reduce((rows, [action, label], index) => {
                if (index % 2 === 0) rows.push([]);
                rows[rows.length - 1].push({
                    text: `${config.action === action ? "✅ " : ""}${label}`,
                    callback_data: `antimedia:action:${selectedLevel}:${action}`
                });
                return rows;
            }, []),
            ...ALL_MEDIA_TYPES.reduce((rows, type, index) => {
                if (index % 2 === 0) rows.push([]);
                rows[rows.length - 1].push({
                    text: `${blockedTypes.includes(type) ? "🚫" : "✅"} ${MEDIA_TYPE_LABELS[type]}`,
                    callback_data: `antimedia:media:${selectedLevel}:toggle:${type}`
                });
                return rows;
            }, []),
            [
                {
                    text: "🚫 Bloquear todas",
                    callback_data: `antimedia:media:${selectedLevel}:blockall`
                },
                {
                    text: "✅ Permitir todas",
                    callback_data: `antimedia:media:${selectedLevel}:allowall`
                }
            ]
        ];
        return {
            text: _telegramMenuHtml(config, selectedLevel, levelLabel, prefix),
            parse_mode: "HTML",
            reply_markup: { inline_keyboard }
        };
    }

    return { text: "" };
}

function _discordMenuEmbed(config, selectedLevel, levelLabel, prefix, EmbedBuilder) {
    const textCommands = [
        `${prefix}antimedia ${selectedLevel} add <mídia,...>`,
        `${prefix}antimedia ${selectedLevel} remove <mídia,...>`,
        `${prefix}antimedia ${selectedLevel} list`,
        `${prefix}antimedia ${selectedLevel} message <texto>`,
        `${prefix}antimedia ${selectedLevel} userwhitelist|userblacklist add|remove|list <usuário>`,
        `${prefix}antimedia ${selectedLevel} rolewhitelist|roleblacklist add|remove|list <cargo>`,
        `${prefix}antimedia help`
    ].map(command => `\`${command}\``).join("\n");
    const inheritance = selectedLevel === "server"
        ? "Não se aplica ao servidor."
        : config.ignoreParent
            ? "Isolado dos escopos superiores."
            : "Herdando dos escopos superiores.";
    const allowedTypes = _getAllowedMediaTypes(config);
    const blockedSummary = _mediaTypesStatus(config);
    const allowedSummary = allowedTypes.length ? _formatConfigList(allowedTypes) : "Nenhuma";

    return new EmbedBuilder({
        color: config.enabled ? 0x57F287 : 0x5865F2,
        title: `📹 Antimedia · ${levelLabel}`,
        description: [
            `**Proteção:** ${config.enabled ? "✅ Ativa" : "🔕 Inativa"}`,
            `**Ação:** ${config.action} · ${ACTIONS[config.action] || ""}`
        ].join("\n"),
        fields: [
            {
                name: "🎞️ Mídias bloqueadas",
                value: [
                    `**Bloqueadas:** ${blockedSummary}`,
                    `**Permitidas:** ${allowedSummary}`,
                    `**Tipos válidos:** ${ALL_MEDIA_TYPES.join(", ")}`
                ].join("\n"),
                inline: false
            },
            {
                name: "⚙️ Herança e listas",
                value: [
                    `**Herança:** ${inheritance}`,
                    `**Usuários isentos:** ${_formatConfigList(config.userWhitelist)}`,
                    `**Usuários restritos:** ${_formatConfigList(config.userBlacklist)}`
                ].join("\n"),
                inline: false
            },
            {
                name: "💬 Aviso personalizado",
                value: _truncateConfigText(config.message || "(padrão)", 300),
                inline: false
            },
            {
                name: "⌨️ Personalização por texto",
                value: textCommands,
                inline: false
            }
        ],
        footer: { text: "Use os botões e o seletor abaixo para alterar esta configuração." }
    }).toJSON();
}

function _telegramMenuHtml(config, selectedLevel, levelLabel, prefix) {
    const textCommands = [
        `${prefix}antimedia ${selectedLevel} add <mídia,...>`,
        `${prefix}antimedia ${selectedLevel} remove <mídia,...>`,
        `${prefix}antimedia ${selectedLevel} list`,
        `${prefix}antimedia ${selectedLevel} message <texto>`,
        `${prefix}antimedia help`
    ].map(command => `<code>${_escapeHtml(command)}</code>`).join("\n");
    const inheritance = selectedLevel === "server"
        ? "Não se aplica ao grupo."
        : config.ignoreParent
            ? "Isolado do grupo."
            : "Herdando do grupo.";
    const allowedTypes = _getAllowedMediaTypes(config);
    const blockedSummary = _mediaTypesStatus(config);
    const allowedSummary = allowedTypes.length ? _formatConfigList(allowedTypes) : "Nenhuma";

    return [
        `<b>📹 ANTIMEDIA · ${_escapeHtml(levelLabel)}</b>`,
        "",
        "<b>Proteção</b>",
        `Estado: ${config.enabled ? "✅ Ativa" : "🔕 Inativa"}`,
        `Ação: <code>${_escapeHtml(config.action)}</code> · ${_escapeHtml(ACTIONS[config.action] || "")}`,
        "",
        "<b>Mídias bloqueadas e permitidas</b>",
        `Bloqueadas: ${_escapeHtml(blockedSummary)}`,
        `Permitidas: ${_escapeHtml(allowedSummary)}`,
        `Tipos válidos: <code>${_escapeHtml(ALL_MEDIA_TYPES.join(", "))}</code>`,
        "",
        "<b>Herança e listas</b>",
        `Herança: ${_escapeHtml(inheritance)}`,
        `Usuários isentos: ${_escapeHtml(_formatConfigList(config.userWhitelist))}`,
        `Usuários restritos: ${_escapeHtml(_formatConfigList(config.userBlacklist))}`,
        "",
        "<b>Aviso personalizado</b>",
        `<i>${_escapeHtml(_truncateConfigText(config.message || "(padrão)", 300))}</i>`,
        "",
        "<b>Personalização por texto</b>",
        textCommands
    ].join("\n");
}

function _scopeButtonLabel(platform, level, selectedLevel) {
    const labels = {
        discord: { server: "Servidor", categoria: "Categoria", chat: "Canal/tópico" },
        telegram: { server: "Grupo", chat: "Tópico" }
    };
    const label = labels[platform]?.[level] || getLevelLabel(platform, level);
    return level === selectedLevel ? `✅ ${label}` : label;
}

function _getToggleButtons(level, config, ButtonBuilder, ButtonStyle) {
    const fields = [
        { key: "enabled", label: config.enabled ? "✅ Antimedia ativo" : "🔕 Antimedia inativo" },
        ...(level === "server" ? [] : [{
            key: "ignoreParent",
            label: `Herda superiores: ${config.ignoreParent ? "Não" : "Sim"}`
        }])
    ];
    return fields.map(field => new ButtonBuilder()
        .setCustomId(`antimedia:toggle:${field.key}:${level}`)
        .setLabel(field.label)
        .setStyle(config[field.key] ? ButtonStyle.Success : ButtonStyle.Secondary));
}

function _telegramToggleButton(level, field, config) {
    const labels = {
        enabled: config.enabled ? "✅ Antimedia: ON" : "🔕 Antimedia: OFF",
        ignoreParent: config.ignoreParent ? "Ignora superiores: ON" : "Herda superiores: ON"
    };
    return {
        text: labels[field],
        callback_data: `antimedia:toggle:${field}:${level}`
    };
}

function _whatsappSummary(message) {
    const config = getSetAntimedia(message, "chat") || readAntimedia(null);
    const prefix = message.prefix || "!";
    const allowedTypes = _getAllowedMediaTypes(config);
    return [
        "📹 CONFIGURAÇÃO DO ANTIMEDIA — GRUPO ATUAL",
        "",
        `Estado: ${config.enabled ? "✅ Ativo" : "🔕 Inativo"}`,
        `Ação: ${config.action} — ${ACTIONS[config.action] || ""}`,
        `Mídias bloqueadas: ${_mediaTypesStatus(config)}`,
        `Mídias permitidas: ${allowedTypes.length ? _formatConfigList(allowedTypes) : "Nenhuma"}`,
        `Aviso personalizado: ${_truncateConfigText(config.message || "(padrão)", 300)}`,
        `Usuários isentos: ${_formatConfigList(config.userWhitelist)}`,
        `Usuários restritos: ${_formatConfigList(config.userBlacklist)}`,
        "",
        `Para ver a ajuda completa, use: ${prefix}antimedia help`
    ].join("\n");
}

function _formatConfigList(values) {
    if (!values?.length) return "Nenhum";
    const displayed = values.slice(0, 5).map(value => _truncateConfigText(value, 40));
    if (values.length > displayed.length) displayed.push(`e mais ${values.length - displayed.length}`);
    return displayed.join(", ");
}

function _getBlockedMediaTypes(config) {
    if (config.allowAllMedia) return [];
    if (config.mediaTypes?.length) return normalizeMediaTypes(config.mediaTypes);
    return [...ALL_MEDIA_TYPES];
}

function _getAllowedMediaTypes(config) {
    const blockedTypes = new Set(_getBlockedMediaTypes(config));
    return ALL_MEDIA_TYPES.filter(type => !blockedTypes.has(type));
}

function _mediaTypesStatus(config) {
    if (config.allowAllMedia) return "Nenhuma (todas permitidas)";
    if (!config.mediaTypes?.length) return "Todas (padrão)";
    return _formatConfigList(_getBlockedMediaTypes(config));
}

function _isSameMediaSelection(current, update) {
    const currentBlocked = _getBlockedMediaTypes(current);
    const nextBlocked = update.allowAllMedia
        ? []
        : update.mediaTypes.length
            ? normalizeMediaTypes(update.mediaTypes)
            : [...ALL_MEDIA_TYPES];
    return currentBlocked.length === nextBlocked.length &&
        currentBlocked.every(type => nextBlocked.includes(type));
}

function _truncateConfigText(value, maxLength) {
    const text = String(value).replace(/\s+/g, " ").trim();
    return text.length > maxLength
        ? `${text.slice(0, maxLength - 1)}…`
        : text;
}

function _escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function _handleConfigurationInteraction(interaction) {
    const componentId = interaction?.customId || interaction?.callbackQuery?.data || "";
    const parts = String(componentId).split(":");
    const [commandName, action, value, menuLevel, extra] = parts;
    if (commandName !== "antimedia") return false;

    const message = interaction[Symbol.for("satbot.componentMessageContext")];
    if (!message) return false;
    const adapter = _getAdapter(message);
    const userOk = isOwner(message) || (adapter?.checkUserPermission
        ? await adapter.checkUserPermission(message.chatId, message.userId)
        : message.sender?.isAdmin);
    if (!userOk) {
        await message.reply({ text: "❌ Apenas administradores podem configurar o antimedia." });
        return true;
    }

    const levels = getAvailableLevels(message);
    if (action === "scope") {
        const selectedLevel = value;
        if (!levels.includes(selectedLevel)) {
            await message.reply({ text: "❌ Esse escopo não está disponível neste chat." });
            return true;
        }
        if (selectedLevel === menuLevel) {
            await _answerComponent(interaction, "Esse escopo já está selecionado.");
            return true;
        }
        return _updateConfigurationMenu(interaction, message, selectedLevel);
    }

    const selectedLevel = action === "toggle" ? menuLevel : value;
    if (!levels.includes(selectedLevel)) {
        await message.reply({ text: "❌ Esse escopo não está disponível neste chat." });
        return true;
    }
    const current = getSetAntimedia(message, selectedLevel);
    if (!current) {
        await message.reply({ text: "❌ Não encontrei as configurações desse escopo." });
        return true;
    }

    let update;
    if (action === "toggle") {
        const field = value;
        if (!Object.prototype.hasOwnProperty.call(TOGGLE_FIELDS, field) ||
            (field === "ignoreParent" && selectedLevel === "server")) {
            await message.reply({ text: "❌ Essa opção não pode ser alterada neste escopo." });
            return true;
        }
        update = { [TOGGLE_FIELDS[field]]: !current[TOGGLE_FIELDS[field]] };
    } else if (action === "action") {
        const selectedAction = interaction.values?.[0] || menuLevel;
        if (!Object.prototype.hasOwnProperty.call(ACTIONS, selectedAction)) {
            await message.reply({ text: "❌ Ação inválida." });
            return true;
        }
        update = { action: selectedAction };
    } else if (action === "media") {
        if (interaction.callbackQuery && menuLevel === "toggle") {
            if (!ALL_MEDIA_TYPES.includes(extra)) {
                await message.reply({ text: "❌ Tipo de mídia inválido." });
                return true;
            }
            const blockedTypes = _getBlockedMediaTypes(current);
            const nextBlockedTypes = blockedTypes.includes(extra)
                ? blockedTypes.filter(type => type !== extra)
                : [...blockedTypes, extra];
            update = {
                mediaTypes: nextBlockedTypes,
                allowAllMedia: nextBlockedTypes.length === 0
            };
        } else if (menuLevel === "blockall") {
            update = { mediaTypes: [...ALL_MEDIA_TYPES], allowAllMedia: false };
        } else if (menuLevel === "allowall") {
            update = { mediaTypes: [], allowAllMedia: true };
        } else if (Array.isArray(interaction.values)) {
            const mediaTypes = normalizeMediaTypes(interaction.values);
            if (mediaTypes.some(type => !ALL_MEDIA_TYPES.includes(type))) {
                await message.reply({ text: "❌ A seleção contém um tipo de mídia inválido." });
                return true;
            }
            update = {
                mediaTypes,
                allowAllMedia: mediaTypes.length === 0
            };
        } else {
            return false;
        }
    } else {
        return false;
    }

    if (action === "media") {
        if (_isSameMediaSelection(current, update)) {
            await _answerComponent(interaction, "As mídias já estão configuradas assim.");
            return true;
        }
    }

    const changesEnabled = update.enabled === true;
    const requestedAction = update.action || current.action;
    if ((changesEnabled || update.action) && STRONG_ACTIONS.includes(requestedAction)) {
        const botOk = adapter?.checkBotPermission
            ? await adapter.checkBotPermission(message.chatId, requestedAction)
            : false;
        if (!botOk) {
            await message.reply({
                text: `⚠️ O bot não tem permissão para executar a ação *${requestedAction}*. Conceda as permissões necessárias ou escolha outra ação.`
            });
            return true;
        }
    }

    if (action !== "media") {
        const field = Object.keys(update)[0];
        const updatedValue = update[field];
        if (updatedValue === current[field]) {
            await _answerComponent(interaction, "Essa configuração já está assim.");
            return true;
        }
    }
    if (!getSetAntimedia(message, selectedLevel, update)) {
        await message.reply({ text: "❌ Não foi possível salvar essa configuração." });
        return true;
    }
    return _updateConfigurationMenu(interaction, message, selectedLevel);
}

async function _answerComponent(interaction, text) {
    if (interaction.callbackQuery) {
        await interaction.answerCbQuery(text);
    } else {
        await interaction.reply({ content: text, ephemeral: true });
    }
}

async function _updateConfigurationMenu(interaction, message, selectedLevel) {
    const payload = _configurationMenu(message, selectedLevel);
    if (interaction.callbackQuery) {
        await interaction.answerCbQuery();
        await interaction.editMessageText(payload.text, {
            parse_mode: payload.parse_mode,
            reply_markup: payload.reply_markup
        });
    } else {
        const { EmbedBuilder } = require("discord.js");
        await interaction.update({
            content: "",
            embeds: [new EmbedBuilder(payload.embed)],
            components: payload.components || []
        });
    }
    return true;
}

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
    lines.push('    ↳ Omitindo o nível, a alteração vale somente para o chat atual.');
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
        const types = _mediaTypesStatus(cfg);
        const uwl = (cfg.userWhitelist || []).length ? `${cfg.userWhitelist.length} usuário(s)` : "0";
        const ubl = (cfg.userBlacklist || []).length ? `${cfg.userBlacklist.length} usuário(s)` : "0";
        lines.push(`  ${enabled ? "✅" : "❌"} ${label} (${level}) — Mídias: ${types} | WL: ${uwl} | BL: ${ubl}`);
    }

    return lines.join("\n");
}
