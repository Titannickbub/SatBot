const economy = require("../../functions/economy");
const xp = require("../../functions/xp");
const { replyWorkActivity } = require("../../functions/workActivityReply");

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
    category: "economia/trabalhos",
    description: `💼 Realiza um trabalho aleatório na economia local para receber salário em satcoins e ganhar XP.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}trabalhar

O bot sorteia uma profissão e o desfecho do seu expediente, podendo render salários padrão, bônus por produtividade ou descontos por incidentes.

⏳ Limite de 2 tentativas diárias por usuário. Se esgotar, você pode comprar um reset na {prefix}loja.`,
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
                worked: false,
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
            worked: true,
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
    return replyWorkActivity(message, {
        title: "TRABALHO",
        emoji: "💼",
        name: result.name,
        status: result.status,
        amount: result.worked ? result.amount : null,
        balance: result.balance,
        remaining: result.worked ? result.remaining : null,
        remainingLabel: "Trabalhos",
        activityLabel: "trabalhos",
        resultLabel: result.job ? "🛠️Atividade" : null,
        resultValue: result.job,
        xp: result.worked ? result.activityXp || 0 : null
    });
}
