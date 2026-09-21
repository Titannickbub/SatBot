const economy = require("../../functions/economy");

module.exports = {
    name: "transferir",
    aliases: ["transfer", "enviar", "pagar"],
    category: "economia",
    description: "Transfere satcoins para outro usuário do grupo ou servidor.",
    usage: "{prefix}transferir <valor> <id|@usuário> ou respondendo a uma mensagem",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A transferência só funciona em grupos ou servidores." });
        }

        const parsed = parseAmount(message.args?.[0]);
        if (!parsed.valid) {
            return message.reply({
                text: `❌ Valor inválido. Use um valor a partir de ${economy.formatMoney(economy.MIN_TRANSFER_AMOUNT)}, por exemplo: ${message.prefix}transferir 10,00 @usuario.`
            });
        }

        const target = resolveTarget(message);
        if (!target) {
            return message.reply({
                text: "❌ Não encontrei o destinatário. Informe o ID, mencione a pessoa ou responda à mensagem dela."
            });
        }

        const result = economy.transfer(message, target.userId, parsed.amount);
        if (!result.transferred) {
            return replyResult(message, {
                success: false,
                target,
                amount: parsed.amount,
                balance: result.balance,
                remaining: result.remaining,
                status: getErrorMessage(result.reason, parsed.amount)
            });
        }

        return replyResult(message, {
            success: true,
            target,
            amount: parsed.amount,
            balance: result.balance,
            remaining: result.remaining,
            status: "✅ Transferência realizada com sucesso!"
        });
    }
};

function parseAmount(value) {
    if (value === undefined || value === null) return { valid: false };
    const normalized = String(value).trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return { valid: false };

    const [whole, cents = ""] = normalized.split(".");
    const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0") || 0);
    return Number.isSafeInteger(amount) && amount >= economy.MIN_TRANSFER_AMOUNT
        ? { valid: true, amount }
        : { valid: false };
}

function resolveTarget(message) {
    const directTarget = message.args?.slice(1).join(" ").trim();
    const candidates = [
        message.quoted?.userId,
        message.platform === "discord" ? message.raw?.mentions?.users?.first()?.id : null,
        ...(message.mentionedJids || []),
        directTarget
    ].filter(Boolean);

    for (const candidate of candidates) {
        const account = economy.findAccount(message, candidate);
        if (account) return account;

        if (isUsableId(message.platform, candidate) && String(candidate) !== String(message.userId)) {
            return {
                userId: normalizeId(message.platform, candidate),
                username: null,
                displayName: null
            };
        }
    }

    function isUsableId(platform, value) {
        const normalized = String(value).trim();
        if (platform === "whatsapp") return /\d{5,}/.test(normalized);
        return /^\d+$/.test(normalized);
    }

    function normalizeId(platform, value) {
        const normalized = String(value).trim();
        if (platform === "discord") {
            const mention = normalized.match(/^<@!?(\d+)>$/);
            return mention ? mention[1] : normalized;
        }
        return normalized;
    }

    return null;
}

function getErrorMessage(reason, amount) {
    switch (reason) {
        case "invalid_amount":
            return `❌ O valor mínimo para transferência é ${economy.formatMoney(economy.MIN_TRANSFER_AMOUNT)}.`;
        case "limit":
            return "⏳ Você já fez três transferências hoje. O limite volta amanhã.";
        case "self":
            return "❌ Você não pode transferir satcoins para si mesmo.";
        case "insufficient_balance":
            return `❌ Saldo insuficiente para transferir ${economy.formatMoney(amount)}.`;
        case "recipient_not_found":
            return "❌ Esse destinatário ainda não possui uma carteira neste grupo/servidor.";
        default:
            return "❌ Não foi possível concluir a transferência.";
    }
}

async function replyResult(message, result) {
    const amount = economy.formatMoney(result.amount);
    const balance = economy.formatMoney(result.balance);
    const remaining = `${result.remaining} transferência(s) restante(s) hoje`;
    const targetId = String(result.target.userId);
    const targetName = result.target.displayName || result.target.username || targetId;

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: result.success ? 0x2ECC71 : 0xE74C3C,
                title: result.success ? "💸 Transferência concluída" : "💸 Transferência não realizada",
                description: [
                    `**Destinatário:** <@${targetId}> (${targetName})`,
                    `**Valor:** ${amount}`,
                    result.success ? `**Seu saldo:** ${balance}` : null,
                    `**Limite diário:** ${remaining}`,
                    "",
                    result.status
                ].filter(Boolean).join("\n"),
                footer: { text: "Economia local deste servidor" }
            }
        });
    }

    if (message.platform === "telegram") {
        const escapeHtml = value => String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        return message.reply({
            text: [
                result.success ? "<b>💸 TRANSFERÊNCIA CONCLUÍDA</b>" : "<b>💸 TRANSFERÊNCIA NÃO REALIZADA</b>",
                "━━━━━━━━━━━━━━━━━━━━━━",
                `<b>Destinatário:</b> ${escapeHtml(targetName)}`,
                `<b>ID:</b> <code>${escapeHtml(targetId)}</code>`,
                `<b>Valor:</b> ${escapeHtml(amount)}`,
                result.success ? `<b>Seu saldo:</b> ${escapeHtml(balance)}` : null,
                `<b>Limite diário:</b> ${escapeHtml(remaining)}`,
                "",
                escapeHtml(result.status)
            ].filter(Boolean).join("\n"),
            parse_mode: "HTML"
        });
    }

    const escapeMarkdown = value => String(value).replace(/([*_~`\\])/g, "\\$1");
    return message.reply({
        text: [
            result.success ? "*💸 TRANSFERÊNCIA CONCLUÍDA*" : "*💸 TRANSFERÊNCIA NÃO REALIZADA*",
            "━━━━━━━━━━━━━━━━━━━━━━",
            `*Destinatário:* ${escapeMarkdown(targetName)}`,
            `*ID:* \`${escapeMarkdown(targetId)}\``,
            `*Valor:* ${escapeMarkdown(amount)}`,
            result.success ? `*Seu saldo:* ${escapeMarkdown(balance)}` : null,
            `*Limite diário:* ${escapeMarkdown(remaining)}`,
            "",
            `_${escapeMarkdown(result.status)}_`
        ].filter(Boolean).join("\n")
    });
}
