const economy = require("../../functions/economy");
const xp = require("../../functions/xp");
const { replyWorkActivity } = require("../../functions/workActivityReply");

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
    category: "economia/trabalhos",
    description: `🎣 Lança a vara de pescar no rio para fisgar peixes, espécies raras e ganhar satcoins e XP.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}pescar

O bot sorteia o resultado da pescaria, podendo capturar peixes valiosos, receber recompensas de comerciantes ou encontrar lixo e perder anzóis.

⏳ Limite de 2 tentativas diárias por usuário. Se esgotar, você pode comprar um reset na {prefix}loja.`,
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
                fished: false,
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
            fished: true,
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
    const typeLabels = {
        normal: "Peixe comum",
        rare: "Peixe raro",
        trash: "Lixo",
        bad: "Imprevisto ruim",
        good: "Evento especial"
    };
    return replyWorkActivity(message, {
        title: "PESCA",
        emoji: "🎣",
        name: result.name,
        status: result.status,
        amount: result.fished ? result.amount : null,
        balance: result.balance,
        remaining: result.fished ? result.remaining : null,
        remainingLabel: "Pescarias",
        activityLabel: "pescarias",
        resultLabel: result.fished ? "Resultado" : null,
        resultValue: result.fished ? typeLabels[result.type] || "Nenhum" : null,
        xp: result.fished ? result.activityXp || 0 : null
    });
}
