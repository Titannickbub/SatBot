const economy = require("../../functions/economy");
const xp = require("../../functions/xp");

const STATUS_MESSAGES = {
    partial: [
        "💰 Você conseguiu levar parte do saldo da vítima!",
        "🦹 O golpe deu certo: uma parte do saldo mudou de dono.",
        "🎒 A abordagem funcionou e você saiu com uma boa quantia.",
        "💸 Você foi rápido e conseguiu pegar parte do dinheiro."
    ],
    total: [
        "💎 Golpe perfeito! Você levou todo o saldo da vítima.",
        "🏦 A carteira foi completamente esvaziada.",
        "🤑 Sucesso absoluto: não sobrou satcoin para a vítima.",
        "🎯 Você acertou o golpe do século e levou tudo."
    ],
    failed: [
        "😶 Você tentou, mas não conseguiu roubar nada.",
        "🕶️ A vítima percebeu o movimento e você saiu de mãos vazias.",
        "🌫️ O plano parecia perfeito, mas não rendeu nada.",
        "🤡 Você tentou aplicar o golpe, mas acabou enganado pelo próprio plano."
    ],
    caught: [
        "🚓 Você foi pego e teve que pagar uma multa.",
        "👮 A segurança chegou na hora e você perdeu dinheiro na fuga.",
        "📸 Você foi reconhecido e precisou pagar para não ser denunciado.",
        "🚨 O golpe foi descoberto: sua carteira sofreu as consequências."
    ],
    lawsuit: [
        "⚖️ A vítima reagiu e você teve que pagar uma indenização.",
        "📄 A vítima abriu um processo e você perdeu dinheiro no acordo.",
        "👨‍⚖️ O tribunal ficou do lado da vítima: pague a indenização.",
        "💼 O advogado da vítima foi mais rápido e cobrou uma compensação."
    ],
    nothing: [
        "🕵️ Você tentou roubar alguém que não tinha nada a ser roubado. Que azar!",
        "🪙 O alvo estava mais quebrado que você. A tentativa foi perdida.",
        "📭 Você invadiu uma carteira vazia. Nem poeira sobrou.",
        "😅 O golpe foi perfeito, mas a vítima não tinha dinheiro.",
        "🛒 Você tentou assaltar uma carteira sem saldo. Péssimo planejamento.",
        "🔍 Depois de procurar bastante, não encontrou nem uma moeda."
    ],
    self: [
        "❌ Você não pode roubar a si mesmo.",
        "🪞 O alvo é você mesmo. Esse golpe não faz sentido.",
        "🤦 Você tentou assaltar a própria carteira.",
        "🔄 Para roubar alguém, escolha outro usuário."
    ],
    limit: [
        "⏳ Você já usou suas três tentativas de roubo hoje.",
        "🛑 Suas tentativas acabaram por hoje. Volte amanhã.",
        "🌙 A cota de roubos foi encerrada; descanse até a próxima virada.",
        "📉 Você gastou todas as oportunidades de hoje."
    ],
    already_targeted: [
        "❌ Você já tentou roubar essa pessoa hoje.",
        "🔁 Essa vítima já foi escolhida por você hoje.",
        "🚫 Não vale insistir no mesmo alvo duas vezes no dia.",
        "🗂️ O alvo já está registrado nas suas tentativas de hoje."
    ],
    victim_not_found: [
        "❌ Essa pessoa não possui uma conta de economia neste grupo/servidor.",
        "📭 Não encontrei uma carteira de economia para essa pessoa.",
        "🔎 O alvo ainda não possui uma conta econômica neste grupo/servidor.",
        "🚫 Só é possível roubar usuários que já tenham carteira neste local."
    ],
    shield: [
        "🛡️ O escudo da vítima bloqueou sua tentativa.",
        "💥 O golpe bateu no escudo e não causou nenhum dano.",
        "🚫 A proteção da vítima impediu o roubo.",
        "🔰 Você tentou atacar, mas o escudo estava ativo."
    ],
    default: [
        "❌ O roubo não pôde ser realizado.",
        "⚠️ O golpe não pôde ser concluído desta vez.",
        "🤷 Algo interrompeu a tentativa de roubo.",
        "🚧 A ação não foi concluída. Tente novamente mais tarde."
    ]
};

module.exports = {
    name: "roubar",
    aliases: ["roubo", "assaltar"],
    category: "economia",
    description: "Tenta roubar satcoins de outro usuário do grupo ou servidor.",
    usage: "{prefix}roubar <id|@usuário> ou respondendo a uma mensagem",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O roubo só funciona em grupos ou servidores." });
        }

        const target = resolveTarget(message);
        if (!target) {
            return message.reply({
                text: "❌ Não encontrei a vítima. Informe o ID, mencione a pessoa ou responda à mensagem dela."
            });
        }

        const result = economy.rob(message, target.userId);
        const xpResult = await xp.addActivityXp(message, "robbery", result);
        result.activityXp = xpResult?.amount || 0;
        return replyResult(message, result, target);
    }
};

function resolveTarget(message) {
    const directTarget = message.args?.join(" ").trim();
    const candidates = [
        message.quoted?.userId,
        message.platform === "discord" ? message.raw?.mentions?.users?.first()?.id : null,
        ...(message.mentionedJids || []),
        directTarget
    ].filter(Boolean);

    for (const candidate of candidates) {
        const account = economy.findAccount(message, candidate);
        if (account) return account;
        if (isUsableId(message.platform, candidate) && String(candidate) !== String(message.userId)) {
            const id = normalizeId(message.platform, candidate);
            const byId = economy.findAccount(message, id);
            if (byId) return byId;
        }
    }
    return null;
}

function isUsableId(platform, value) {
    const normalized = String(value).trim();
    return platform === "whatsapp" ? /\d{5,}/.test(normalized) : /^\d+$/.test(normalized);
}

function normalizeId(platform, value) {
    const normalized = String(value).trim();
    const mention = normalized.match(/^<@!?(\d+)>$/);
    return platform === "discord" && mention ? mention[1] : normalized;
}

async function replyResult(message, result, target) {
    const targetName = target.displayName || target.username || target.userId;
    const amount = economy.formatMoney(Math.abs(result.amount));
    const details = [
        `**Vítima:** ${formatMention(message, target)}`,
        result.amount ? `**Valor:** ${amount}` : null,
        result.outcome === "shield" ? `**Cargas restantes do escudo:** ${result.shieldCharges}/5` : null,
        `**Tentativas restantes:** ${result.remaining}`,
        `**XP da atividade:** +${result.activityXp || 0}`,
        "",
        getStatus(result.outcome)
    ].filter(Boolean).join("\n");

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: result.robbed ? 0x2ECC71 : 0xE74C3C,
                title: result.robbed ? "🦹 Roubo realizado" : "🚨 Roubo frustrado",
                description: details,
                footer: { text: `Alvo: ${targetName}` }
            }
        });
    }

    if (message.platform === "telegram") {
        return message.reply({
            text: `<b>${result.robbed ? "🦹 ROUBO REALIZADO" : "🚨 ROUBO FRUSTRADO"}</b>\n━━━━━━━━━━━━━━━━━━━━━━\n${escapeHtml(details.replace(/\*\*/g, ""))}`,
            parse_mode: "HTML"
        });
    }

    return message.reply({ text: details.replace(/\*\*/g, "") });
}

function getStatus(outcome) {
    const messages = STATUS_MESSAGES[outcome] || STATUS_MESSAGES.default;
    return messages[Math.floor(Math.random() * messages.length)];
}

function formatMention(message, account) {
    if (message.platform === "discord") return `<@${String(account.userId).replace(/\D/g, "")}>`;
    if (message.platform === "whatsapp") return `@${String(account.userId).replace(/^@/, "").split("@")[0]}`;
    return account.username ? `@${String(account.username).replace(/^@/, "")}` : account.displayName || account.userId;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
