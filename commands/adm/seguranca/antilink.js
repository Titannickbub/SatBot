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
    getSetAntilink,
    readAntilink
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
const ACTION_BUTTON_LABELS = {
    delete: "🗑 Deletar",
    warn: "⚠️ Avisar",
    kick: "🚫 Expulsar",
    ban: "🔨 Banir"
};
const TOGGLE_FIELDS = {
    enabled: "enabled",
    ignoreParent: "ignoreParent",
    ignoreSameGroup: "ignoreSameGroup",
    ignoreMedia: "ignoreMedia"
};

module.exports = {
    name: "antilink",
    category: "adm/segurança",
    description: `🔗 Configura a remoção de mensagens com links e as punições aplicadas neste grupo ou servidor.

Sem argumentos, abre o menu de configuração. Mensagem personalizada e listas continuam usando comandos de texto.

🔐 Disponível para administradores do chat e superusuários.

📍 1. Escolha o nível de configuração:
• Discord: server (servidor), categoria (categoria) ou chat (canal/tópico).
• WhatsApp: chat (grupo) ou server (comunidade, quando disponível).
• Telegram: server (grupo/canal) ou chat (tópico, quando disponível).

Os níveis disponíveis dependem da plataforma e do local em que o comando é usado.
Se omitir o nível, a alteração será aplicada somente ao chat atual.

✅ 2. Ative ou desative o antilink no nível escolhido:
{prefix}antilink on
{prefix}antilink chat on
{prefix}antilink off

⚙️ 3. Escolha o que fazer quando um link for detectado:
{prefix}antilink action <delete|warn|kick|ban>
{prefix}antilink chat action warn

delete remove a mensagem; warn remove e avisa; kick remove e expulsa; ban remove e bane. As ações kick e ban exigem que o bot tenha permissão para moderar membros.

💬 Personalize o aviso enviado ao punir:
{prefix}antilink <nível> message <texto>
{prefix}antilink chat message Links não são permitidos aqui!

🧩 4. Configure exceções:

Permitir links do próprio grupo ou servidor:
{prefix}antilink <nível> ignoresame on

Permitir links de mídias, como YouTube, TikTok e Instagram:
{prefix}antilink <nível> ignoremedia on

Ignorar regras dos níveis superiores:
{prefix}antilink <nível> ignoreparent on

Use off no lugar de on para desativar cada exceção. Por padrão, o nível herda as regras superiores.

📋 5. Gerencie domínios permitidos:
{prefix}antilink <nível> whitelist add <domínio>
{prefix}antilink chat whitelist add github.com
{prefix}antilink <nível> whitelist remove <domínio>
{prefix}antilink <nível> whitelist list

👤 6. Gerencie as exceções por usuário:
Adicione ou remova usuários respondendo à mensagem, mencionando-os ou informando ID/número. Usuários na lista branca podem enviar links sem a punição do antilink; a lista negra impede que recebam a exceção de links de mídia. Use list para consultar cada lista.
{prefix}antilink <nível> userwhitelist add <usuário|ID>
{prefix}antilink <nível> userwhitelist remove <usuário|ID>
{prefix}antilink <nível> userwhitelist list
{prefix}antilink <nível> userblacklist add <usuário|ID>
{prefix}antilink <nível> userblacklist remove <usuário|ID>
{prefix}antilink <nível> userblacklist list

No Discord, também é possível gerenciar exceções por cargo. A lista branca isenta o cargo; a lista negra impede que ele receba a exceção de links de mídia.
{prefix}antilink <nível> rolewhitelist add <@cargo|ID|nome>
{prefix}antilink <nível> rolewhitelist remove <@cargo|ID|nome>
{prefix}antilink <nível> rolewhitelist list
{prefix}antilink <nível> roleblacklist add <@cargo|ID|nome>
{prefix}antilink <nível> roleblacklist remove <@cargo|ID|nome>
{prefix}antilink <nível> roleblacklist list

📊 Consulte o estado e as configurações:
{prefix}antilink status`,
    usage: "{prefix}antilink",
    examples: [
        "{prefix}antilink",
        "{prefix}antilink help",
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

        const inputArgs = message.args || [];
        const platform = message.platform;

        // ── 3. Sem args → menu de configuração ─────────────────────────
        if (!inputArgs.length) {
            if (platform === "whatsapp") {
                return message.reply({ text: _whatsappSummary(message) });
            }
            const levels = getAvailableLevels(message);
            const selectedLevel = levels.includes("chat") ? "chat" : levels[0];
            if (!selectedLevel) {
                return message.reply({ text: "❌ Não há escopos de antilink disponíveis neste chat." });
            }
            return message.reply(_configurationMenu(message, selectedLevel));
        }

        const first = inputArgs[0].toLowerCase();

        if (first === "help" || first === "ajuda") {
            return message.reply({ text: _help(message) });
        }

        // ── 4. Status ───────────────────────────────────────────────────
        if (first === "status") {
            return message.reply({ text: await _status(message, adapter) });
        }

        // ── 5. Operações de configuração ────────────────────────────────
        const hasExplicitLevel = ["server", "categoria", "chat"].includes(first);
        const args = hasExplicitLevel ? inputArgs : ["chat", ...inputArgs];
        const level = args[0].toLowerCase();
        const available = getAvailableLevels(message);
        const telegramChatFallback = platform === "telegram" && level === "chat" && !message.threadId;

        if (!available.includes(level) && !telegramChatFallback) {
            const list = available.map(l => `*${l}* (${getLevelLabel(platform, l)})`).join("\n  ");
            return message.reply({
                text: `❌ Nível *${level}* não disponível aqui.\n\nNíveis disponíveis:\n  ${list}`
            });
        }

        const subCmd = (args[1] || "").toLowerCase();
        const argumentOffset = hasExplicitLevel ? 0 : 1;

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
            const newMsg = (message.getArgText ? message.getArgText(2 - argumentOffset) : args.slice(2).join(" ")).trim();
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
    },

    async handleInteraction(interaction) {
        return _handleConfigurationInteraction(interaction);
    }
};

// ─────────────────────────────────────────────────────────────
//  HELPERS DE RESPOSTA
// ─────────────────────────────────────────────────────────────

function _getAdapter(message) {
    return (message.platforms || []).find(platform => platform.name === message.platform) ||
        global.platformRegistry?.[message.platform];
}

function _configurationMenu(message, selectedLevel) {
    const levels = getAvailableLevels(message);
    if (!levels.includes(selectedLevel)) {
        return { text: "❌ Esse escopo não está disponível neste chat." };
    }

    const config = getSetAntilink(message, selectedLevel) || readAntilink(null);
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
                .setCustomId(`antilink:scope:${level}:${selectedLevel}`)
                .setLabel(_scopeButtonLabel(message.platform, level, selectedLevel))
                .setStyle(level === selectedLevel ? ButtonStyle.Primary : ButtonStyle.Secondary))
        );
        const actionMenu = new StringSelectMenuBuilder()
            .setCustomId(`antilink:action:${selectedLevel}`)
            .setPlaceholder(`Ação atual: ${config.action}`)
            .addOptions(Object.entries(ACTIONS).map(([value, description]) => ({
                label: value,
                description: description.replace(/^[^\w]+/u, "").slice(0, 100),
                value
            })));
        const actionRow = new ActionRowBuilder().addComponents(actionMenu);
        const toggles = _getToggleButtons(selectedLevel, config, ButtonBuilder, ButtonStyle);
        const components = [scopeRow, actionRow];
        if (toggles.length) components.push(new ActionRowBuilder().addComponents(...toggles));
        return {
            embed: _discordMenuEmbed(config, selectedLevel, levelLabel, prefix, EmbedBuilder),
            components
        };
    }

    if (message.platform === "telegram") {
        const inline_keyboard = [
            levels.map(level => ({
                text: _scopeButtonLabel(message.platform, level, selectedLevel),
                callback_data: `antilink:scope:${level}:${selectedLevel}`
            })),
            [
                _telegramToggleButton(selectedLevel, "enabled", config),
                ...(selectedLevel === "server" ? [] : [_telegramToggleButton(selectedLevel, "ignoreParent", config)])
            ],
            [
                _telegramToggleButton(selectedLevel, "ignoreSameGroup", config),
                _telegramToggleButton(selectedLevel, "ignoreMedia", config)
            ],
            ...Object.entries(ACTION_BUTTON_LABELS).reduce((rows, [action, label], index) => {
                if (index % 2 === 0) rows.push([]);
                rows[rows.length - 1].push({
                    text: `${config.action === action ? "✅ " : ""}${label}`,
                    callback_data: `antilink:action:${selectedLevel}:${action}`
                });
                return rows;
            }, [])
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
        `${prefix}antilink ${selectedLevel} message <texto>`,
        `${prefix}antilink ${selectedLevel} whitelist add|remove|list <domínio>`,
        `${prefix}antilink ${selectedLevel} userwhitelist add|remove|list <usuário>`,
        `${prefix}antilink ${selectedLevel} userblacklist add|remove|list <usuário>`,
        `${prefix}antilink ${selectedLevel} rolewhitelist|roleblacklist add|remove|list <cargo>`,
        `${prefix}antilink help`
    ].map(command => `\`${command}\``).join("\n");
    const inheritance = selectedLevel === "server"
        ? "Não se aplica ao servidor."
        : config.ignoreParent
            ? "Isolado dos escopos superiores."
            : "Herdando dos escopos superiores.";

    return new EmbedBuilder({
        color: config.enabled ? 0x57F287 : 0x5865F2,
        title: `🔗 Antilink · ${levelLabel}`,
        description: [
            `**Proteção:** ${config.enabled ? "✅ Ativa" : "🔕 Inativa"}`,
            `**Ação:** ${config.action} · ${ACTIONS[config.action] || ""}`
        ].join("\n"),
        fields: [
            {
                name: "⚙️ Exceções",
                value: [
                    `**Herança:** ${inheritance}`,
                    `**Links do grupo/servidor:** ${config.ignoreSameGroup ? "Ignorados" : "Bloqueados"}`,
                    `**Links de mídia:** ${config.ignoreMedia ? "Ignorados" : "Bloqueados"}`
                ].join("\n"),
                inline: false
            },
            {
                name: "📋 Listas",
                value: [
                    `**Domínios:** ${_formatConfigList(config.whitelist)}`,
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
        `${prefix}antilink ${selectedLevel} message <texto>`,
        `${prefix}antilink ${selectedLevel} whitelist add|remove|list <domínio>`,
        `${prefix}antilink ${selectedLevel} userwhitelist add|remove|list <usuário>`,
        `${prefix}antilink ${selectedLevel} userblacklist add|remove|list <usuário>`,
        `${prefix}antilink help`
    ].map(command => `<code>${_escapeHtml(command)}</code>`).join("\n");
    const inheritance = selectedLevel === "server"
        ? "Não se aplica ao grupo."
        : config.ignoreParent
            ? "Isolado do grupo."
            : "Herdando do grupo.";

    return [
        `<b>🔗 ANTILINK · ${_escapeHtml(levelLabel)}</b>`,
        "",
        "<b>Proteção</b>",
        `Estado: ${config.enabled ? "✅ Ativa" : "🔕 Inativa"}`,
        `Ação: <code>${_escapeHtml(config.action)}</code> · ${_escapeHtml(ACTIONS[config.action] || "")}`,
        "",
        "<b>Exceções</b>",
        `Herança: ${_escapeHtml(inheritance)}`,
        `Links do grupo: ${config.ignoreSameGroup ? "Ignorados" : "Bloqueados"}`,
        `Links de mídia: ${config.ignoreMedia ? "Ignorados" : "Bloqueados"}`,
        "",
        "<b>Listas</b>",
        `Domínios: ${_escapeHtml(_formatConfigList(config.whitelist))}`,
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

function _escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
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
        { key: "enabled", label: config.enabled ? "✅ Antilink ativo" : "🔕 Antilink inativo" },
        ...(level === "server" ? [] : [{
            key: "ignoreParent",
            label: `Herda superiores: ${config.ignoreParent ? "Não" : "Sim"}`
        }]),
        { key: "ignoreSameGroup", label: `Ignora links próprios: ${config.ignoreSameGroup ? "Sim" : "Não"}` },
        { key: "ignoreMedia", label: `Ignora links de mídia: ${config.ignoreMedia ? "Sim" : "Não"}` }
    ];
    return fields.map(field => new ButtonBuilder()
        .setCustomId(`antilink:toggle:${field.key}:${level}`)
        .setLabel(field.label)
        .setStyle(config[field.key] ? ButtonStyle.Success : ButtonStyle.Secondary));
}

function _telegramToggleButton(level, field, config) {
    const labels = {
        enabled: config.enabled ? "✅ Antilink: ON" : "🔕 Antilink: OFF",
        ignoreParent: config.ignoreParent ? "Ignora superiores: ON" : "Herda superiores: ON",
        ignoreSameGroup: config.ignoreSameGroup ? "Ignora links próprios: ON" : "Ignora links próprios: OFF",
        ignoreMedia: config.ignoreMedia ? "Ignora mídia: ON" : "Ignora mídia: OFF"
    };
    return {
        text: labels[field],
        callback_data: `antilink:toggle:${field}:${level}`
    };
}

function _whatsappSummary(message) {
    const config = getSetAntilink(message, "chat") || readAntilink(null);
    const prefix = message.prefix || "!";
    return [
        "🔗 CONFIGURAÇÃO DO ANTILINK — GRUPO ATUAL",
        "",
        `Estado: ${config.enabled ? "✅ Ativo" : "🔕 Inativo"}`,
        `Ação: ${config.action} — ${ACTIONS[config.action] || ""}`,
        `Ignora links do grupo: ${config.ignoreSameGroup ? "Sim" : "Não"}`,
        `Ignora links de mídia: ${config.ignoreMedia ? "Sim" : "Não"}`,
        `Aviso personalizado: ${_truncateConfigText(config.message || "(padrão)", 300)}`,
        `Domínios permitidos: ${_formatConfigList(config.whitelist)}`,
        `Usuários isentos: ${_formatConfigList(config.userWhitelist)}`,
        `Usuários restritos: ${_formatConfigList(config.userBlacklist)}`,
        "",
        `Para ver a ajuda completa, use: ${prefix}antilink help`
    ].join("\n");
}

function _formatConfigList(values) {
    if (!values?.length) return "Nenhum";
    const displayed = values.slice(0, 5).map(value => _truncateConfigText(value, 40));
    if (values.length > displayed.length) displayed.push(`e mais ${values.length - displayed.length}`);
    return displayed.join(", ");
}

function _truncateConfigText(value, maxLength) {
    const text = String(value).replace(/\s+/g, " ").trim();
    return text.length > maxLength
        ? `${text.slice(0, maxLength - 1)}…`
        : text;
}

async function _handleConfigurationInteraction(interaction) {
    const componentId = interaction?.customId || interaction?.callbackQuery?.data || "";
    const parts = String(componentId).split(":");
    const [commandName, action, value, menuLevel] = parts;
    if (commandName !== "antilink") return false;

    const message = interaction[Symbol.for("satbot.componentMessageContext")];
    if (!message) return false;
    const adapter = _getAdapter(message);
    const userOk = isOwner(message) || (adapter?.checkUserPermission
        ? await adapter.checkUserPermission(message.chatId, message.userId)
        : message.sender?.isAdmin);
    if (!userOk) {
        await message.reply({ text: "❌ Apenas administradores podem configurar o antilink." });
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
    const current = getSetAntilink(message, selectedLevel);
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
    } else {
        return false;
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

    const updatedValue = update.action || Object.keys(update).map(key => update[key])[0];
    const currentValue = update.action ? current.action : current[Object.keys(update)[0]];
    if (updatedValue === currentValue) {
        await _answerComponent(interaction, "Essa configuração já está assim.");
        return true;
    }
    if (!getSetAntilink(message, selectedLevel, update)) {
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
    lines.push("    ↳ Omitindo o nível, a alteração vale somente para o chat atual.");
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
