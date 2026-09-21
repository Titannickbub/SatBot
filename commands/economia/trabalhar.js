const economy = require("../../functions/economy");
const xp = require("../../functions/xp");

const JOBS = [
    { name: "Entregador", description: "entregou encomendas pela cidade" },
    { name: "Atendente de loja", description: "atendeu clientes durante o expediente" },
    { name: "Mecânico", description: "consertou um veículo que estava parado" },
    { name: "Cozinheiro", description: "preparou pedidos para os clientes" },
    { name: "Jardineiro", description: "cuidou de um jardim que precisava de atenção" },
    { name: "Fotógrafo", description: "registrou momentos importantes para um cliente" },
    { name: "Eletricista", description: "resolveu um problema na instalação elétrica" },
    { name: "Barista", description: "preparou bebidas para uma manhã movimentada" },
    { name: "Técnico de informática", description: "recuperou um computador com defeito" },
    { name: "Guia turístico", description: "acompanhou visitantes pelos pontos da cidade" }
];

const EVENTS = {
    bad: [
        "Você dormiu durante o expediente e foi demitido.",
        "Um acidente danificou suas ferramentas e você teve um prejuízo.",
        "Você entregou o pedido errado e precisou pagar a compensação.",
        "Uma distração causou um pequeno acidente no trabalho.",
        "Você perdeu um equipamento da empresa e teve o valor descontado."
    ],
    good: [
        "Seu desempenho chamou atenção e você recebeu um aumento inesperado!",
        "Você resolveu um problema difícil e ganhou uma gratificação especial!",
        "Um cliente ficou tão satisfeito que deixou uma grande gorjeta!",
        "Você foi escolhido para uma tarefa especial muito bem paga!",
        "A empresa bateu uma meta e dividiu um bônus com a equipe!"
    ]
};

module.exports = {
    name: "trabalhar",
    aliases: ["work", "trabalho"],
    category: "economia",
    description: "Realiza um trabalho e recebe uma recompensa aleatória.",
    usage: "{prefix}trabalhar",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O trabalho só funciona em grupos ou servidores." });
        }

        const result = economy.work(message, JOBS, EVENTS);
        const name = message.displayName || message.username || message.userId;

        if (!result.worked) {
            return replyResult(message, {
                name,
                status: "⏳ Você já trabalhou duas vezes hoje.",
                job: null,
                amount: 0,
                balance: result.balance,
                remaining: 0,
                activityXp: 0
            });
        }

        const xpResult = await xp.addActivityXp(message, "work", result);
        return replyResult(message, {
            name,
            status: result.event || `✅ Você trabalhou como ${result.job}.`,
            job: result.description,
            amount: result.amount,
            balance: result.balance,
            remaining: result.remaining,
            activityXp: xpResult?.amount || 0
        });
    }
};

async function replyResult(message, result) {
    const amount = economy.formatMoney(result.amount);
    const balance = economy.formatMoney(result.balance);
    const amountLabel = result.amount < 0 ? `Saldo perdido: ${amount}` : `Saldo ganho: ${amount}`;
    const details = [
        amountLabel,
        `Saldo atual: ${balance}`,
        `Trabalhos restantes hoje: ${result.remaining}`,
        result.job ? `Atividade: ${result.job}` : null,
        `XP da atividade: +${result.activityXp || 0}`,
        "",
        result.status
    ].filter(Boolean);

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: result.amount < 0 ? 0xE74C3C : 0x2ECC71,
                title: "💼 Trabalho",
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
                "<b>💼 TRABALHO</b>",
                "━━━━━━━━━━━━━━━━━━━━━━",
                `<b>Nome:</b> ${escapeHtml(result.name)}`,
                `<b>ID:</b> <code>${escapeHtml(message.userId)}</code>`,
                `<b>Saldo ganho:</b> ${escapeHtml(amountLabel)}`,
                `<b>Saldo atual:</b> ${balance}`,
                `<b>Trabalhos restantes hoje:</b> ${result.remaining}`,
                result.job ? `<b>Atividade:</b> ${escapeHtml(result.job)}` : null,
                `<b>XP da atividade:</b> +${result.activityXp || 0}`,
                "",
                escapeHtml(result.status)
            ].filter(Boolean).join("\n"),
            parse_mode: "HTML"
        });
    }

    const escapeMarkdown = value => String(value).replace(/([*_~`\\])/g, "\\$1");
    return message.reply({
        text: [
            "*💼 TRABALHO*",
            "━━━━━━━━━━━━━━━━━━━━━━",
            `*Nome:* ${escapeMarkdown(result.name)}`,
            `*ID:* \`${escapeMarkdown(message.userId)}\``,
            `*Saldo ganho:* ${escapeMarkdown(amountLabel)}`,
            `*Saldo atual:* ${balance}`,
            `*Trabalhos restantes hoje:* ${result.remaining}`,
            result.job ? `*Atividade:* ${escapeMarkdown(result.job)}` : null,
            `*XP da atividade:* +${result.activityXp || 0}`,
            "",
            `_${escapeMarkdown(result.status)}_`
        ].filter(Boolean).join("\n")
    });
}
