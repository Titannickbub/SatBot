const economy = require("../../functions/economy");

module.exports = {
    name: "comprar",
    aliases: ["buy", "comprar2"],
    category: "economia/loja",
    description: `🛍️ Compra itens da loja local, resets, itens de proteção ou cosméticos usando seus satcoins.

📝 1. Compre informando o número ou nome do item da loja:
{prefix}comprar 1
{prefix}comprar resetar trabalho
{prefix}comprar escudo
{prefix}comprar 2000
{prefix}comprar fundo azul

Consulte a {prefix}loja para verificar a lista de produtos, números e preços atuais.
Para comprar um item da loja configurada pelos administradores, use {prefix}loja2 e informe o ID (a partir de 1001) ou nome. Os pedidos aguardam entrega manual e podem ser cancelados pela equipe.
Fundos cosméticos podem ser comprados pelo ID (a partir de 2000) ou com "fundo <cor>".

⚠️ Resets só podem ser comprados após esgotar o limite diário da atividade correspondente.`,
    usage: "{prefix}comprar [texto]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A loja só funciona em grupos ou servidores." });
        }

        const selection = message.args?.join(" ");
        if (message.command !== "comprar2") {
            const cosmeticResult = economy.buyProfileBackground(message, selection);
            if (cosmeticResult.matched) {
                if (!cosmeticResult.purchased) {
                    if (cosmeticResult.reason === "insufficient-balance") {
                        return message.reply({
                            text: `❌ Saldo insuficiente. Você precisa de ${economy.formatMoney(cosmeticResult.price)} e tem ${economy.formatMoney(cosmeticResult.balance)}.`
                        });
                    }
                    return message.reply({
                        text: `❌ Fundo não encontrado. Use ${message.prefix}cosmeticos fundo para consultar os IDs e nomes disponíveis.`
                    });
                }

                const backgroundName = cosmeticResult.item.label;
                const text = cosmeticResult.boughtNow
                    ? `✅ Fundo ${backgroundName} comprado e aplicado por ${economy.formatMoney(cosmeticResult.price)}.\nSaldo atual: ${economy.formatMoney(cosmeticResult.balance)}`
                    : `✅ Fundo ${backgroundName} aplicado. Você já tinha comprado esse cosmético, então não houve cobrança.`;
                return message.reply({ text });
            }
        }

        const communityResult = economy.buyCommunityStoreItem(message, selection);
        if (communityResult.purchased) {
            return replyForCommunityOrder(message, communityResult);
        }
        if (message.command === "comprar2") {
            return message.reply({ text: getCommunityErrorMessage(communityResult, message) });
        }

        const result = economy.buyStoreItem(message, selection);
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

function replyForCommunityOrder(message, result) {
    const text = [
        `✅ Pedido #${result.order.id} criado para ${result.item.name}!`,
        `Valor pago: ${economy.formatMoney(result.item.price)}`,
        `Saldo atual: ${economy.formatMoney(result.balance)}`,
        "",
        "⏳ A equipe deste grupo/servidor fará a entrega manualmente.",
        `Administradores: use ${message.prefix}configloja2 pedidos para consultar os pedidos.`
    ].join("\n");

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: 0x2ECC71,
                title: "🧾 Pedido da loja local",
                description: text,
                footer: { text: `Item #${result.item.id} • pedido aguardando entrega` }
            }
        });
    }
    if (message.platform === "telegram") {
        return message.reply({
            text: `<b>🧾 PEDIDO #${result.order.id} CRIADO</b>\n${escapeHtml(result.item.name)}\nValor pago: ${escapeHtml(economy.formatMoney(result.item.price))}\nSaldo atual: ${escapeHtml(economy.formatMoney(result.balance))}\n\n⏳ A equipe fará a entrega manualmente.\nAdministradores: use ${escapeHtml(message.prefix)}configloja2 pedidos para consultar.`,
            parse_mode: "HTML"
        });
    }
    return message.reply({ text });
}

function getCommunityErrorMessage(result, message) {
    if (result.reason === "out_of_stock") return "❌ Esse item está esgotado no momento.";
    if (result.reason === "insufficient_balance") {
        return `❌ Saldo insuficiente. Você precisa de ${economy.formatMoney(result.item.price)} para comprar esse item.`;
    }
    return `❌ Item da loja 2 não encontrado. Use ${message.prefix}loja2 para consultar os itens e seus IDs (a partir de 1001).`;
}

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
