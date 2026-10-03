const economy = require("../../functions/economy");

const DEFAULT_BET = 1000;
const FRUITS = ["🍒", "🍋", "🍉", "🍇", "🍊", "🍎", "🍓", "🥝"];
const WIN_MESSAGES = [
    "🎉 JACKPOT! A sorte está brilhando para você!",
    "💰 Que combinação perfeita! O cassino pagou alto!",
    "✨ Três iguais! Hoje é o seu dia de sorte!",
    "🥳 Vitória espetacular! Você dominou as frutas!",
    "🏆 A máquina foi generosa. Parabéns pelo prêmio!"
];
const LOSS_MESSAGES = [
    "😬 As frutas não combinaram. A casa levou essa.",
    "🎲 Quase! Talvez a próxima rodada seja a sua.",
    "🍂 A sorte escapou por pouco desta vez.",
    "😅 A máquina girou, mas não quis colaborar.",
    "💸 Essa rodada ficou para o cassino. Tente novamente depois."
];

module.exports = {
    name: "cassino",
    aliases: ["casino", "slot"],
    category: "economia",
    description: "Faz uma aposta na roleta de frutas usando satcoins do grupo ou servidor atual. Informe o valor opcionalmente (padrão: 10 satcoins); cada pessoa pode jogar até cinco vezes por dia.",
    usage: "{prefix}cassino [valor]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O cassino só funciona em grupos ou servidores." });
        }

        const parsedBet = parseBet(message.args);
        if (!parsedBet.valid) {
            return message.reply({
                text: "❌ Aposta inválida. Use, por exemplo, cassino, cassino 100 ou cassino 10.99."
            });
        }

        const result = economy.casino(message, parsedBet.amount, FRUITS);
        const name = message.displayName || message.username || message.userId;

        if (!result.played) {
            const status = result.reason === "limit"
                ? "⏳ Você já usou o cassino cinco vezes hoje."
                : result.reason === "insufficient_balance"
                    ? `❌ Você precisa ter ${economy.formatMoney(parsedBet.amount)} para fazer essa aposta.`
                    : "❌ O valor da aposta precisa ser maior que zero.";
            return replyResult(message, {
                name,
                status,
                result: null,
                bet: parsedBet.amount,
                payout: 0,
                amount: 0,
                balance: result.balance,
                remaining: result.remaining,
                reason: result.reason
            });
        }

        return replyResult(message, {
            name,
            status: result.won
                ? pickRandom(WIN_MESSAGES)
                : pickRandom(LOSS_MESSAGES),
            result: result.result,
            bet: result.bet,
            payout: result.payout,
            amount: result.amount,
            balance: result.balance,
            remaining: result.remaining
        });
    }
};

function parseBet(args) {
    if (!args || args.length === 0) {
        return { valid: true, amount: DEFAULT_BET };
    }

    if (args.length !== 1 || !/^\d+(?:\.\d{1,2})?$/.test(String(args[0]))) {
        return { valid: false };
    }

    const [whole, cents = ""] = String(args[0]).split(".");
    const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0") || 0);
    return Number.isSafeInteger(amount) && amount > 0
        ? { valid: true, amount }
        : { valid: false };
}

async function replyResult(message, result) {
    if (message.platform !== "discord" && result.reason === "limit") {
        const notice = createResetNotice();
        if (message.platform === "telegram") {
            return message.reply({
                text: `<b>🎰 CASSINO</b>\n━━━━━━━━━━━━━━━━━━━━━━\n${notice}`,
                parse_mode: "HTML"
            });
        }
        return message.reply({ text: `*🎰 CASSINO*\n━━━━━━━━━━━━━━━━━━━━━━\n${notice}` });
    }

    const bet = economy.formatMoney(result.bet);
    const payout = economy.formatMoney(result.payout);
    const amount = economy.formatMoney(result.amount);
    const balance = economy.formatMoney(result.balance);
    const machine = result.result
        ? [`║ ${result.result.join("  |  ")} ║`]
        : ["║  🎰 ...  ║"];
    const details = [
        `🎲 Aposta: ${bet}`,
        result.payout > 0 ? `🏆 Prêmio: ${payout}` : null,
        result.amount < 0 ? `❌ Saldo perdido: ${economy.formatMoney(Math.abs(result.amount))}` : null,
        result.amount > 0 ? `💰 Lucro: ${amount}` : null,
        `🏦 Saldo atual: ${balance}`,
        `🎰 Jogadas restantes hoje: ${result.remaining}`,
        "",
        result.status
    ].filter(Boolean);

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: result.amount > 0 ? 0x2ECC71 : result.amount < 0 ? 0xE74C3C : 0xF1C40F,
                title: "🎰 Cassino",
                description: [
                    `**Nome:** ${result.name}`,
                    `**ID:** \`${message.userId}\``,
                    "",
                    ...machine,
                    "",
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
                "<b>🎰 CASSINO</b>",
                "━━━━━━━━━━━━━━━━━━━━━━",
                `🏷️Nome: <b>${escapeHtml(result.name)}</b>`,
                "",
                "<pre>",
                ...machine.map(line => escapeHtml(line)),
                "</pre>",
                "",
                ...details.map(line => line ? escapeHtml(line) : "")
            ].join("\n"),
            parse_mode: "HTML"
        });
    }

    const escapeMarkdown = value => String(value).replace(/([*_~`\\])/g, "\\$1");
    return message.reply({
        text: [
            "*🎰 CASSINO*",
            "━━━━━━━━━━━━━━━━━━━━━━",
            `🏷️Nome: *${escapeMarkdown(result.name)}*`,
            "",
            "```",
            ...machine.map(line => escapeMarkdown(line)),
            "```",
            "",
            ...details.map(line => escapeMarkdown(line))
        ].join("\n")
    });
}

function createResetNotice() {
    const now = new Date();
    const resetAt = new Date(now);
    resetAt.setHours(24, 0, 0, 0);
    const secondsRemaining = Math.max(0, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;
    return `⏳ Você já usou suas jogadas de cassino de hoje. Resete o cassino na loja ou aguarde a próxima virada do dia em ${hours}h ${minutes}m ${seconds}s.`;
}

function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}
