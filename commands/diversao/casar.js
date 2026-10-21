const marriage = require("../../functions/marriageService");
const activity = require("../../functions/activity");
const economy = require("../../functions/economy");
const xp = require("../../functions/xp");

module.exports = {
    name: "casar",
    category: "diversão/RPG",
    description: `💍 Cria e gerencia casamentos dentro de cada grupo ou servidor.

💌 Envie um pedido:
{prefix}casar @pessoa

Ou responda a uma mensagem da pessoa. O pedido precisa ser aceito em até 5 minutos.

💖 Case consigo mesmo(a):
{prefix}casar me

✅ Aceite um pedido respondendo à mensagem do pedido:
{prefix}casar aceitar

Ou indique quem pediu:
{prefix}casar aceitar @pretendente

📋 Consulte pedidos, relacionamento ou encerre o casamento:
{prefix}casar pedidos
{prefix}casar status [@pessoa]
{prefix}divorciar`,
    usage: "{prefix}casar help",

    async execute(message) {
        try {
            const scope = marriage.getScope(message);
            if (!scope) {
                return message.reply({
                    text: "❌ O casamento só pode ser usado em grupos do WhatsApp/Telegram ou em servidores do Discord."
                });
            }

            const args = Array.isArray(message.args) ? message.args : [];
            const action = String(args[0] || "").trim().toLowerCase();
            const targets = getTargets(message);
            const quotedUser = message.quoted?.userId && !message.quoted.isBot && !message.quoted.fromMe
                ? { id: String(message.quoted.userId), name: message.quoted.displayName || message.quoted.username || String(message.quoted.userId) }
                : null;
            const selfRequest = ["me", "mim", "self"].includes(action);
            const selectedTarget = selfRequest
                ? null
                : quotedUser || targets[0] || null;
            const unresolvedMention = targets.find(target => !target.id);
            if (unresolvedMention && !quotedUser && !selfRequest) {
                return message.reply({
                    text: "❌ Não consegui identificar essa menção. No Telegram, selecione a pessoa pela lista de usuários ou responda a uma mensagem dela."
                });
            }
            const requestId = getQuotedRequestId(message);

            if (["help", "ajuda"].includes(action)) {
                return message.reply({ text: help(message) });
            }

            if (["aceitar", "accept"].includes(action)) {
                const result = marriage.accept(message, {
                    requestId,
                    requesterId: selectedTarget?.id
                });
                if (result.error) return message.reply({ text: `❌ ${result.error}` });
                return message.reply({
                    text: `💍 ${result.marriage.firstName} e ${result.marriage.secondName} agora estão casados neste grupo/servidor!\n📅 Desde ${formatDate(result.marriage.marriedAt)}.`
                });
            }

            if (["rejeitar", "recusar", "reject"].includes(action)) {
                const result = marriage.reject(message, {
                    requestId,
                    requesterId: selectedTarget?.id
                });
                if (result.error) return message.reply({ text: `❌ ${result.error}` });
                return message.reply({ text: `💔 O pedido de ${result.request.requesterName} foi recusado.` });
            }

            if (["pedidos", "inbox"].includes(action)) {
                const requests = marriage.getPending(message);
                if (!requests.length) return message.reply({ text: "📭 Você não tem pedidos de casamento pendentes neste grupo/servidor." });
                const lines = requests.map((request, index) =>
                    `${index + 1}. ${request.requesterName} — até ${formatDate(request.expiresAt)}\n   ID: ${request.id}`
                );
                return message.reply({ text: `💌 *Pedidos de casamento pendentes:*\n\n${lines.join("\n\n")}\n\nResponda à mensagem do pedido com \`${message.prefix}casar aceitar\` ou indique quem pediu.` });
            }

            if (["status", "ver", "info"].includes(action)) {
                const target = selectedTarget || { id: String(message.userId), name: message.displayName || message.username || "Você" };
                const relationships = marriage.getMarriages(message, target.id);
                if (!relationships.length) {
                    return message.reply({ text: `💔 ${target.name} não está casado(a) neste grupo/servidor.` });
                }
                const lines = relationships.map(current => {
                    const duration = marriage.formatDuration(current.marriedAt);
                    const relation = current.selfMarriage
                        ? "consigo mesmo(a)"
                        : `com ${current.partnerName}`;
                    return `• ${relation} desde ${formatDate(current.marriedAt)} (há ${duration})`;
                });
                return message.reply({
                    text: relationships.length === 1
                        ? `💍 ${target.name} está casado(a) ${relationships[0].selfMarriage ? "consigo mesmo(a)" : `com ${relationships[0].partnerName}`} neste grupo/servidor.\n📅 Desde ${formatDate(relationships[0].marriedAt)}\n⏳ Há ${marriage.formatDuration(relationships[0].marriedAt)}.`
                        : `💍 ${target.name} tem ${relationships.length} relacionamentos neste grupo/servidor:\n${lines.join("\n")}`
                });
            }

            if (["divorciar", "divorcio", "separar"].includes(action)) {
                return message.reply({ text: `ℹ️ Use \`${message.prefix}divorciar\` e marque seu parceiro ou responda a uma mensagem dele para confirmar o divórcio.` });
            }

            if (!action && !selectedTarget) {
                return message.reply({ text: help(message) });
            }

            const recipient = selfRequest
                ? { id: String(message.userId), name: message.displayName || message.username || String(message.userId) }
                : selectedTarget || {
                id: String(message.userId),
                name: message.displayName || message.username || String(message.userId)
            };
            const result = marriage.request(message, recipient);
            if (result.error) return message.reply({ text: `❌ ${result.error}` });

            const expiresAt = formatDate(result.request.expiresAt);
            if (result.duplicate) {
                return message.reply({
                    text: `💌 Você já enviou um pedido para ${result.request.recipientName}.\n⌛ Ele ainda pode ser aceito até ${expiresAt}.\nID do pedido: ${result.request.id}`
                });
            }

            const mentions = message.platform === "whatsapp" && recipient.id !== String(message.userId)
                ? [recipient.id]
                : undefined;
            const recipientLabel = formatMention(message.platform, recipient);
            return message.reply({
                text: `💌 ${formatMention(message.platform, { id: String(message.userId), name: message.displayName || message.username })} pediu ${recipientLabel} em casamento!\n\nPara aceitar, responda a esta mensagem com \`${message.prefix}casar aceitar\` ou use \`${message.prefix}casar aceitar @pretendente\`.\n⌛ Pedido disponível até ${expiresAt} (por 5 minutos).\nID do pedido: ${result.request.id}`,
                mentions
            });
        } catch (error) {
            console.error("[CASAR] Erro ao executar comando:", error);
            return message.reply({ text: "❌ Não foi possível concluir essa ação de casamento agora. Tente novamente." });
        }
    }
};

function getTargets(message) {
    const candidates = [];
    if (message.platform === "whatsapp") {
        const mentioned = Array.isArray(message.mentionedJids) ? message.mentionedJids : [];
        for (const id of mentioned) candidates.push({ id: String(id), name: `@${String(id).split("@")[0].split(":")[0]}` });
    } else if (message.platform === "discord") {
        for (const user of message.raw?.mentions?.users?.values?.() || []) {
            candidates.push({ id: String(user.id), name: user.globalName || user.displayName || user.username || String(user.id) });
        }
    } else if (message.platform === "telegram") {
        const rawMessage = message.raw?.message || {};
        const text = rawMessage.text || rawMessage.caption || "";
        for (const entity of rawMessage.entities || rawMessage.caption_entities || []) {
            if (entity.type === "text_mention" && entity.user) {
                const name = [entity.user.first_name, entity.user.last_name].filter(Boolean).join(" ") || entity.user.username || String(entity.user.id);
                candidates.push({ id: String(entity.user.id), name });
                continue;
            }
            if (entity.type !== "mention") continue;
            const mention = text.substring(entity.offset, entity.offset + entity.length);
            const found = economy.findAccount(message, mention) ||
                activity.findUser(message, mention) ||
                xp.findUser(message, mention);
            candidates.push(found
                ? { id: String(found.userId), name: found.displayName || found.username || mention }
                : { id: null, name: mention });
        }
    }

    const unique = [];
    const seen = new Set();
    for (const candidate of candidates) {
        const key = candidate.id || candidate.name;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(candidate);
    }
    return unique;
}

function getQuotedRequestId(message) {
    const text = String(message.quoted?.text || "");
    const match = text.match(/ID do pedido:\s*([0-9a-f-]{36})/i);
    return match ? match[1] : null;
}

function formatMention(platform, user) {
    if (platform === "discord") return `<@${user.id}>`;
    if (platform === "whatsapp") return `@${String(user.id).split("@")[0].split(":")[0]}`;
    return user.name || `usuário ${user.id}`;
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "horário indisponível"
        : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

function help(message) {
    const prefix = message.prefix || "!";
    return [
        "💍 *CASAMENTO NO GRUPO/SERVIDOR*",
        "",
        `• ${prefix}casar @pessoa — envia um pedido válido por 5 minutos`,
        `• ${prefix}casar (respondendo à mensagem) — envia pedido para a pessoa`,
        `• ${prefix}casar me — pede você mesmo(a) em casamento`,
        `• ${prefix}casar aceitar — aceite respondendo à mensagem do pedido`,
        `• ${prefix}casar aceitar @pretendente — escolha quem pediu`,
        `• ${prefix}casar rejeitar [@pretendente] — recusa um pedido`,
        `• ${prefix}casar pedidos — lista os pedidos recebidos`,
        `• ${prefix}casar status [@pessoa] — consulta os relacionamentos`,
        `• ${prefix}divorciar — veja como confirmar um divórcio`
    ].join("\n");
}
