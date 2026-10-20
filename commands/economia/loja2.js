const economy = require("../../functions/economy");

module.exports = {
    name: "loja2",
    aliases: ["mercado"],
    category: "economia/loja",
    description: `🛍️ Exibe a loja configurada pelos administradores deste grupo/servidor.

📝 Consulte os itens, os preços e a quantidade disponível:
{prefix}loja2

Compre pelo ID ou nome usando {prefix}comprar <id|nome> (ou {prefix}comprar2 <id|nome>).`,
    usage: "{prefix}loja2",

    async execute(message) {
        const store = economy.getCommunityStore(message);
        if (!store) {
            return message.reply({ text: "❌ A loja só funciona em grupos ou servidores." });
        }

        const prefix = message.prefix || "!";
        const groupedItems = groupItemsByCategory(store.items);
        const lines = [
            `*${escapeMarkdown(store.title)}*`,
            "━━━━━━━━━━━━━━━━━━━━━━",
            "",
            "*ℹ️ AVISO DOS ADMS:*",
            `_${escapeMarkdown(store.notice)}_`,
            "",
            "*✨ ITENS DISPONÍVEIS*"
        ];
        if (store.items.length === 0) {
            lines.push("_A loja ainda não tem itens cadastrados._");
        } else {
            for (const [category, items] of groupedItems) {
                lines.push("", `_${escapeMarkdown(category)}_`);
                for (const item of items) {
                    const quantity = item.quantity === null ? "∞" : `📦 ${item.quantity}`;
                    lines.push(`🏷️ ID ${item.id}. *${escapeMarkdown(item.name)}* — ${economy.formatMoney(item.price)} | ${quantity}`);
                }
            }
        }

        lines.push(
            "",
            "━━━━━━━━━━━━━━━━━━━━━━",
            "*🧾 COMO COMPRAR*",
            `\`${escapeMarkdown(prefix)}comprar <id|nome>\` ou \`${escapeMarkdown(prefix)}comprar2 <id|nome>\``,
            `🔢 Exemplo: \`${escapeMarkdown(prefix)}comprar 1001\``,
            `🏷️ Exemplo: \`${escapeMarkdown(prefix)}comprar Fanart\``,
            "",
            "*📌 REGRAS DA LOJA LOCAL*",
            "📦 O valor é descontado automaticamente do seu saldo.",
            "⏳ A compra gera um pedido para a equipe realizar a entrega manual.",
            "❌ Se o pedido for cancelado, o valor é devolvido."
        );
        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: 0xF1C40F,
                    title: store.title,
                    description: [
                        "ℹ️ **AVISO DOS ADMS:**",
                        store.notice,
                        "",
                        "**✨ ITENS DISPONÍVEIS**",
                        ...groupedItems.flatMap(([category, items]) => [
                            `_${category}_`,
                            ...items.map(item =>
                                `🏷️ ID ${item.id}. **${item.name}** — ${economy.formatMoney(item.price)} | ${item.quantity === null ? "∞" : `📦 ${item.quantity}`}`
                            )
                        ]),
                        ...(store.items.length === 0 ? ["A loja ainda não tem itens cadastrados."] : []),
                        "",
                        `Compre com \`${prefix}comprar <id|nome>\`.`
                    ].join("\n"),
                    fields: [
                        {
                            name: "🧾 Como comprar",
                            value: `\`${prefix}comprar 1001\` ou \`${prefix}comprar Fanart\``
                        },
                        {
                            name: "📌 Regras",
                            value: "O valor é descontado do saldo; a entrega é manual. Pedidos cancelados são reembolsados."
                        }
                    ],
                    footer: { text: "Estoque e saldo locais deste servidor" }
                }
            });
        }
        if (message.platform === "telegram") {
            const htmlItems = groupedItems.flatMap(([category, items]) => [
                "",
                `<i>${escapeHtml(category)}</i>`,
                ...items.map(item =>
                    `🏷️ ID ${item.id}. <b>${escapeHtml(item.name)}</b> — ${escapeHtml(economy.formatMoney(item.price))} | ${item.quantity === null ? "∞" : `📦 ${item.quantity}`}`
                )
            ]);
            return message.reply({
                text: [
                    `<b>${escapeHtml(store.title)}</b>`,
                    "━━━━━━━━━━━━━━━━━━━━━━",
                    "",
                    "<b>ℹ️ AVISO DOS ADMS:</b>",
                    escapeHtml(store.notice),
                    "",
                    "<b>✨ ITENS DISPONÍVEIS</b>",
                    ...(store.items.length === 0 ? ["A loja ainda não tem itens cadastrados."] : htmlItems),
                    "",
                    "━━━━━━━━━━━━━━━━━━━━━━",
                    "<b>🧾 COMO COMPRAR</b>",
                    `<code>${escapeHtml(prefix)}comprar &lt;id|nome&gt;</code> ou <code>${escapeHtml(prefix)}comprar2 &lt;id|nome&gt;</code>`,
                    `🔢 Exemplo: <code>${escapeHtml(prefix)}comprar 1001</code>`,
                    `🏷️ Exemplo: <code>${escapeHtml(prefix)}comprar Fanart</code>`,
                    "",
                    "<b>📌 REGRAS DA LOJA LOCAL</b>",
                    "📦 O valor é descontado automaticamente do seu saldo.",
                    "⏳ A compra gera um pedido para entrega manual.",
                    "❌ Se o pedido for cancelado, o valor é devolvido."
                ].join("\n"),
                parse_mode: "HTML"
            });
        }

        return message.reply({ text: lines.join("\n") });
    }
};

function groupItemsByCategory(items) {
    const categories = new Map();
    for (const item of items) {
        if (!categories.has(item.category)) categories.set(item.category, []);
        categories.get(item.category).push(item);
    }
    return [...categories];
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeMarkdown(value) {
    return String(value).replace(/([*_~`\\])/g, "\\$1");
}
