const economy = require("../../functions/economy");

module.exports = {
    name: "loja",
    aliases: ["shop", "store"],
    category: "economia",
    description: "Exibe os resets disponíveis na loja de economia.",
    usage: "{prefix}loja",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A loja só funciona em grupos ou servidores." });
        }

        const items = economy.getStoreItems();
        const lines = [
            "🛒 LOJA DE ECONOMIA",
            "━━━━━━━━━━━━━━━━━━━━━━",
            ...items.map(item => `${item.position}. ${item.name} — ${economy.formatMoney(item.price)}`),
            "",
            "Como comprar:",
            `Use ${message.prefix}comprar <número> ou ${message.prefix}comprar <nome>.`,
            `Exemplo: ${message.prefix}comprar 1`,
            "Resets são ativados imediatamente; produtos têm suas próprias regras.",
            "Cada item só pode ser comprado quando o limite correspondente acabar."
        ];

        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: 0xF1C40F,
                    title: "🛒 Loja de resets",
                    description: lines.slice(2).join("\n"),
                    footer: { text: "Os preços e limites pertencem à economia local deste servidor" }
                }
            });
        }

        if (message.platform === "telegram") {
            return message.reply({
                text: `<b>🛒 LOJA DE RESETS</b>\n━━━━━━━━━━━━━━━━━━━━━━\n${escapeHtml(lines.slice(2).join("\n"))}`,
                parse_mode: "HTML"
            });
        }

        return message.reply({ text: lines.join("\n") });
    }
};

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
