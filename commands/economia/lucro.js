const economy = require("../../functions/economy");

const LABELS = {
    resgate: "Resgate diário",
    trabalho: "Trabalho",
    pesca: "Pesca",
    mineracao: "Mineração",
    cassino: "Cassino",
    transferenciaEnviada: "Transferências enviadas",
    transferenciaRecebida: "Transferências recebidas",
    roubo: "Roubos realizados",
    rouboSofrido: "Roubos sofridos",
    loja: "Gastos na loja"
};

module.exports = {
    name: "lucro",
    aliases: ["ganhos", "lucrodiario", "lucro-diario", "media"],
    category: "economia",
    description: "Consulta seu lucro ou prejuízo líquido de hoje na economia do grupo ou servidor, discriminado por atividade e acompanhado do total.",
    usage: "{prefix}lucro",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O lucro diário só funciona em grupos ou servidores." });
        }

        const result = economy.getDailyProfits(message);
        const lines = Object.entries(result.profits).map(([key, amount]) =>
            `${LABELS[key]}: ${formatSigned(amount)}`
        );
        lines.push("", `Lucro diário total: ${formatSigned(result.total)}`);

        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: result.total >= 0 ? 0x2ECC71 : 0xE74C3C,
                    title: "📊 Lucro diário",
                    description: [`**Data:** ${result.date}`, ...lines].join("\n"),
                    footer: { text: "Valores líquidos registrados desde a virada do dia" }
                }
            });
        }

        if (message.platform === "telegram") {
            return message.reply({
                text: `<b>📊 LUCRO DIÁRIO</b>\n━━━━━━━━━━━━━━━━━━━━━━\n<b>Data:</b> ${escapeHtml(result.date)}\n${escapeHtml(lines.join("\n"))}`,
                parse_mode: "HTML"
            });
        }

        return message.reply({
            text: [`*📊 LUCRO DIÁRIO*`, "━━━━━━━━━━━━━━━━━━━━━━", `*Data:* ${result.date}`, ...lines.map(line => `*${escapeMarkdown(line)}*`)].join("\n")
        });
    }
};

function formatSigned(amount) {
    const value = Number(amount) || 0;
    return `${value >= 0 ? "+" : "-"}${economy.formatMoney(Math.abs(value))}`;
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
