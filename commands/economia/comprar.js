const economy = require("../../functions/economy");

module.exports = {
    name: "comprar",
    aliases: ["buy"],
    category: "economia",
    description: "Compra um reset disponível na loja.",
    usage: "{prefix}comprar <número|nome>",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A loja só funciona em grupos ou servidores." });
        }

        const result = economy.buyStoreItem(message, message.args?.[0]);
        if (!result.purchased) {
            return message.reply({ text: getErrorMessage(result.reason, message, result.item) });
        }

        const text = [
            `✅ ${result.item.name} comprado com sucesso!`,
            result.item.key === "shield"
                ? `🛡️ Escudo ativo com ${result.shieldCharges} cargas de proteção.`
                : "O reset já está ativo.",
            `Valor pago: ${economy.formatMoney(result.item.price)}`,
            `Saldo atual: ${economy.formatMoney(result.balance)}`
        ].join("\n");

        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: 0x2ECC71,
                    title: "🛒 Compra concluída",
                    description: text,
                    footer: { text: "Economia local deste servidor" }
                }
            });
        }

        if (message.platform === "telegram") {
            return message.reply({ text: `<b>🛒 COMPRA CONCLUÍDA</b>\n━━━━━━━━━━━━━━━━━━━━━━\n${escapeHtml(text)}`, parse_mode: "HTML" });
        }

        return message.reply({ text });
    }
};

function getErrorMessage(reason, message, item) {
    if (reason === "invalid_item") {
        return `❌ Item inválido. Use ${message.prefix}loja para ver a lista e escolha uma posição ou nome.`;
    }
    if (reason === "not_ready") {
        return "⏳ Esse limite ainda não acabou. Você só pode comprar o reset quando esgotar todas as tentativas do item.";
    }
    if (reason === "shield_active") {
        return "🛡️ Você já possui um escudo ativo. Só poderá comprar outro quando as cinco cargas acabarem.";
    }
    if (reason === "shield_min_balance") {
        return `❌ Você precisa ter pelo menos ${economy.formatMoney(economy.MIN_SHIELD_BALANCE)} para comprar um escudo.`;
    }
    if (reason === "all_not_ready") {
        return "⏳ O reset todos só fica disponível quando trabalho, pesca e mineração chegarem ao limite.";
    }
    if (reason === "insufficient_balance") {
        return `❌ Saldo insuficiente. Você precisa de ${economy.formatMoney(item.price)} para comprar esse reset.`;
    }
    return "❌ Não foi possível concluir a compra.";
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
