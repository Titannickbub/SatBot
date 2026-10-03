const economy = require("../../functions/economy");

const ITEM_EMOJIS = {
    work: "💼",
    fishing: "🎣",
    mining: "⛏️",
    casino: "🎰",
    transfer: "💸",
    robbery: "🥷",
    all: "🔄",
    shield: "🛡️"
};

module.exports = {
    name: "loja",
    aliases: ["shop", "store"],
    category: "economia",
    description: "Lista os resets e itens disponíveis na loja de economia, com preços, requisitos e a sintaxe para comprar por número ou nome.",
    usage: "{prefix}loja",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A loja só funciona em grupos ou servidores." });
        }

        const items = economy.getStoreItems();
        const itemLines = items.map(item =>
            `${ITEM_EMOJIS[item.key] || "🔹"} ${item.position}. ${item.name} — ${economy.formatMoney(item.price)}`
        );
        const prefix = message.prefix || "!";
        const purchaseInstructions = [
            "⏳ Resets só podem ser comprados quando o limite correspondente acabar.",
            "🔄 O reset todos exige que trabalho, pesca, mineração e roubo estejam no limite.",
            "🛡️ O escudo exige saldo mínimo de 500,00💷 e só pode ser comprado sem outro escudo ativo."
        ];

        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: 0xF1C40F,
                    title: "🛒 Loja de Economia",
                    description: [
                        "Use satcoins para comprar resets e itens nesta comunidade.",
                        "",
                        ...itemLines.map(line => `**${line}**`)
                    ].join("\n"),
                    fields: [
                        {
                            name: "🧾 Como comprar",
                            value: [
                                `\`${prefix}comprar <número|nome>\``,
                                `Ex.: \`${prefix}comprar 1\` ou \`${prefix}comprar resetar trabalho\``
                            ].join("\n")
                        },
                        {
                            name: "📌 Regras",
                            value: purchaseInstructions.join("\n")
                        }
                    ],
                    footer: { text: "Preços e saldo são locais deste servidor" }
                }
            });
        }

        const lines = [
            message.platform === "telegram" ? "<b>🛒 LOJA DE ECONOMIA</b>" : "*🛒 LOJA DE ECONOMIA*",
            "━━━━━━━━━━━━━━━━━━━━━━",
            "",
            message.platform === "telegram" ? "✨ <b>Itens disponíveis</b>" : "*✨ Itens disponíveis*",
            ...itemLines.map(line => message.platform === "telegram" ? escapeHtml(line) : `*${escapeMarkdown(line)}*`),
            "",
            message.platform === "telegram" ? "🧾 <b>COMO COMPRAR</b>" : "*🧾 COMO COMPRAR*",
            message.platform === "telegram"
                ? `<code>${escapeHtml(prefix)}comprar &lt;número|nome&gt;</code>`
                : `\`${escapeMarkdown(prefix)}comprar <número|nome>\``,
            message.platform === "telegram"
                ? `🔢 Número: <code>${escapeHtml(prefix)}comprar 1</code>`
                : `🔢 Número: \`${escapeMarkdown(prefix)}comprar 1\``,
            message.platform === "telegram"
                ? `🏷️ Nome: <code>${escapeHtml(prefix)}comprar resetar trabalho</code>`
                : `🏷️ Nome: \`${escapeMarkdown(prefix)}comprar resetar trabalho\``,
            "",
            message.platform === "telegram" ? "📌 <b>REGRAS</b>" : "*📌 REGRAS*",
            ...purchaseInstructions
        ];

        return message.reply({
            text: lines.join("\n"),
            ...(message.platform === "telegram" ? { parse_mode: "HTML" } : {})
        });
    }
};

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
