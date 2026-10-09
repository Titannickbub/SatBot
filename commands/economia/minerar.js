const economy = require("../../functions/economy");
const xp = require("../../functions/xp");

const EVENTS = {
    common: [
        "Você encontrou uma veia de minério comum entre as rochas.",
        "A picareta revelou pedras de boa qualidade.",
        "Depois de muito esforço, você separou alguns minerais valiosos.",
        "Um brilho discreto apareceu no fundo da caverna."
    ],
    rare: [
        "A parede se partiu e revelou uma pedra rara!",
        "Você encontrou um cristal que quase ninguém consegue localizar.",
        "Sua picareta acertou uma formação mineral extremamente valiosa.",
        "Um raro brilho colorido iluminou a mina."
    ],
    good: [
        "Um especialista avaliou sua descoberta e pagou uma recompensa extra!",
        "Você encontrou uma antiga jazida esquecida e ficou com parte do valor.",
        "Seu trabalho ajudou uma equipe perdida na mina, que agradeceu com um bônus.",
        "Uma empresa comprou suas pedras por um preço muito acima do esperado."
    ],
    bad: [
        "Parte do túnel desabou e danificou seus equipamentos.",
        "A picareta quebrou ao atingir uma camada muito dura.",
        "Você se perdeu na mina e precisou pagar para encontrar a saída.",
        "Uma queda derrubou seu saco de pedras e causou prejuízo.",
        "A poeira estragou parte do equipamento de proteção."
    ],
    minerals: {
        common: ["Carvão", "Cobre", "Ferro", "Pedra", "Ardósia"],
        rare: ["Ouro", "Lápis-lazúli", "Redstone", "Diamante", "Esmeralda"],
        good: ["Diamante", "Esmeralda", "Ouro", "Quartzo do Nether", "Detritos ancestrais"],
        bad: ["Carvão", "Cobre", "Ferro", "Pedra"]
    }
};

const TYPE_LABELS = {
    common: "Pedra comum",
    rare: "Pedra rara",
    good: "Acontecimento bom",
    bad: "Acontecimento ruim"
};

module.exports = {
    name: "minerar",
    aliases: ["mineracao", "mineração", "mine"],
    category: "economia",
    description: `⛏️ Explora a caverna para extrair minérios, pedras raras e ganhar satcoins e XP para seu perfil.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}minerar

O bot sorteia os minerais encontrados e acontecimentos da mina, podendo render bons lucros ou eventuais custos de reparo de equipamento.

⏳ Limite de 2 tentativas diárias por usuário. Se esgotar, você pode comprar um reset na {prefix}loja.`,
    usage: "{prefix}minerar",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A mineração só funciona em grupos ou servidores." });
        }

        const result = economy.mine(message, EVENTS);
        const name = message.displayName || message.username || message.userId;

        const xpResult = result.mined
            ? await xp.addActivityXp(message, "mining", result)
            : null;
        return replyResult(message, {
            name,
            mined: result.mined,
            status: result.mined ? result.event : "⏳ Você já minerou duas vezes hoje.",
            amount: result.mined ? result.amount : 0,
            balance: result.balance,
            remaining: result.remaining,
            type: result.mined ? result.type : null,
            mineral: result.mined ? result.mineral : null,
            activityXp: xpResult?.amount || 0
        });
    }
};

async function replyResult(message, result) {
    if (message.platform !== "discord" && !result.mined) {
        const now = new Date();
        const resetAt = new Date(now);
        resetAt.setHours(24, 0, 0, 0);
        const secondsRemaining = Math.max(0, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
        const hours = Math.floor(secondsRemaining / 3600);
        const minutes = Math.floor((secondsRemaining % 3600) / 60);
        const seconds = secondsRemaining % 60;
        const notice = `⏳ Você já usou suas minerações de hoje. Resete a mineração na loja ou aguarde a próxima virada do dia em ${hours}h ${minutes}m ${seconds}s.`;

        if (message.platform === "telegram") {
            return message.reply({
                text: `<b>⛏️ MINERAÇÃO</b>\n━━━━━━━━━━━━━━━━━━━━━━\n${notice}`,
                parse_mode: "HTML"
            });
        }

        return message.reply({
            text: `*⛏️ MINERAÇÃO*\n━━━━━━━━━━━━━━━━━━━━━━\n${notice}`
        });
    }

    const amount = economy.formatMoney(result.amount);
    const balance = economy.formatMoney(result.balance);
    const amountLabel = result.amount < 0
        ? `❌ Saldo perdido: ${economy.formatMoney(Math.abs(result.amount))}`
        : result.amount === 0
            ? `➖ Sem ganho ou perda: ${amount}`
            : `💰 Saldo ganho: ${amount}`;
    const details = [
        `Resultado: ${TYPE_LABELS[result.type] || "Nenhum"}`,
        result.mineral ? `Encontrado: ${result.mineral}` : null,
        amountLabel,
        `Saldo atual: ${balance}`,
        `Minerações restantes hoje: ${result.remaining}`,
        `XP da atividade: +${result.activityXp || 0}`,
        "",
        result.status
    ];

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: result.amount < 0 ? 0xE74C3C : 0x2ECC71,
                title: "⛏️ Mineração",
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
                "<b>⛏️ MINERAÇÃO</b>",
                "━━━━━━━━━━━━━━━━━━━━━━",
                `🏷️Nome: <b>${escapeHtml(result.name)}</b>`,
                result.mineral ? `🔍Encontrado: ${escapeHtml(result.mineral)}` : null,
                result.amount < 0
                    ? `❌ Saldo perdido: ${economy.formatMoney(Math.abs(result.amount))}`
                    : `💰 Saldo ganho: ${amount}`,
                `🏦Saldo atual: ${balance}`,
                `⛏️Minerações restantes hoje: ${result.remaining}`,
                `✳️XP da atividade: +${result.activityXp || 0}`,
                "",
                escapeHtml(result.status)
            ].filter(line => line !== null).join("\n"),
            parse_mode: "HTML"
        });
    }

    const escapeMarkdown = value => String(value).replace(/([*_~`\\])/g, "\\$1");
    return message.reply({
        text: [
            "*⛏️ MINERAÇÃO*",
            "━━━━━━━━━━━━━━━━━━━━━━",
            `🏷️Nome: *${escapeMarkdown(result.name)}*`,
            result.mineral ? `🔍Encontrado: ${result.mineral}` : null,
            result.amount < 0
                ? `❌ Saldo perdido: ${economy.formatMoney(Math.abs(result.amount))}`
                : `💰 Saldo ganho: ${amount}`,
            `🏦Saldo atual: ${balance}`,
            `⛏️Minerações restantes hoje: ${result.remaining}`,
            `✳️XP da atividade: +${result.activityXp || 0}`,
            "",
            result.status
        ].filter(line => line !== null).join("\n")
    });
}
