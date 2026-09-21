const economy = require("../../functions/economy");
const xp = require("../../functions/xp");

const EVENTS = {
    normal: [
        "Você fisgou um peixe fresco perto da margem.",
        "A pescaria rendeu um peixe de bom tamanho.",
        "Depois de esperar com paciência, você puxou um peixe comum."
    ],
    rare: [
        "A linha quase arrebentou, mas você conseguiu tirar um peixe raro!",
        "Você encontrou um ponto excelente e fisgou uma espécie rara!",
        "Uma captura rara apareceu no seu anzol!"
    ],
    trash: [
        "Você puxou uma lata velha. Pelo menos ajudou a limpar o rio.",
        "O anzol trouxe apenas uma bota perdida.",
        "Você pescou um saco plástico e nenhum peixe."
    ],
    bad: [
        "Uma onda levou parte do seu equipamento e você teve prejuízo.",
        "Você escorregou no barranco e precisou pagar pelo conserto da vara.",
        "Um peixe briguento arrebentou sua linha e danificou o anzol.",
        "A chuva estragou sua caixa de equipamentos."
    ],
    good: [
        "Um comerciante viu sua captura e pagou um bônus especial!",
        "Você ajudou a encontrar um barco perdido e recebeu uma recompensa.",
        "Sua pescaria foi tão boa que um restaurante comprou tudo por um preço excelente!"
    ]
};

module.exports = {
    name: "pescar",
    aliases: ["pesca", "fish"],
    category: "economia",
    description: "Pesca e recebe um resultado aleatório até duas vezes por dia.",
    usage: "{prefix}pescar",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A pesca só funciona em grupos ou servidores." });
        }

        const result = economy.fish(message, EVENTS);
        const name = message.displayName || message.username || message.userId;

        if (!result.fished) {
            return replyResult(message, {
                name,
                status: "⏳ Você já pescou duas vezes hoje.",
                amount: 0,
                balance: result.balance,
                remaining: 0,
                type: null,
                activityXp: 0
            });
        }

        const xpResult = await xp.addActivityXp(message, "fishing", result);
        return replyResult(message, {
            name,
            status: result.event,
            amount: result.amount,
            balance: result.balance,
            remaining: result.remaining,
            type: result.type,
            activityXp: xpResult?.amount || 0
        });
    }
};

async function replyResult(message, result) {
    const amount = economy.formatMoney(result.amount);
    const balance = economy.formatMoney(result.balance);
    const amountLabel = result.amount < 0
        ? `Saldo perdido: ${amount}`
        : result.amount === 0
            ? "Resultado: nenhum satcoin"
            : `Saldo ganho: ${amount}`;
    const typeLabels = {
        normal: "Peixe comum",
        rare: "Peixe raro",
        trash: "Lixo",
        bad: "Imprevisto ruim",
        good: "Evento especial"
    };
    const details = [
        `Resultado: ${typeLabels[result.type] || "Nenhum"}`,
        amountLabel,
        `Saldo atual: ${balance}`,
        `Pescarias restantes hoje: ${result.remaining}`,
        `XP da atividade: +${result.activityXp || 0}`,
        "",
        result.status
    ];

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: result.amount < 0 ? 0xE74C3C : result.amount === 0 ? 0x95A5A6 : 0x2ECC71,
                title: "🎣 Pesca",
                description: [
                    `**Nome:** ${result.name}`,
                    `**ID:** \`${message.userId}\``,
                    ...details
                ].join("\n"),
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
                "<b>🎣 PESCA</b>",
                "━━━━━━━━━━━━━━━━━━━━━━",
                `<b>Nome:</b> ${escapeHtml(result.name)}`,
                `<b>ID:</b> <code>${escapeHtml(message.userId)}</code>`,
                ...details.map(line => line ? escapeHtml(line) : ""),
            ].join("\n"),
            parse_mode: "HTML"
        });
    }

    const escapeMarkdown = value => String(value).replace(/([*_~`\\])/g, "\\$1");
    return message.reply({
        text: [
            "*🎣 PESCA*",
            "━━━━━━━━━━━━━━━━━━━━━━",
            `*Nome:* ${escapeMarkdown(result.name)}`,
            `*ID:* \`${escapeMarkdown(message.userId)}\``,
            ...details.map(line => line ? escapeMarkdown(line) : ""),
        ].join("\n")
    });
}
