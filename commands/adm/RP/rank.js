const activity = require("../../../functions/activity");
const economy = require("../../../functions/economy");
const economyAdmin = require("../../../functions/economyAdmin");
const { renderRanking } = require("../../../functions/imageBanner");
const { cleanJid, sameUserId } = require("../../../functions/moderationHelper");
const xp = require("../../../functions/xp");

const aliases = [
    "rankxp", "rankingxp", "ranking-xp",
    "rankativos", "rankingativos", "ranking-ativos", "rankatividade", "rankativo",
    "rankinatividade", "rank_ativos", "rankinativos", "rank_inativos",
    "rankrico", "rank_rico", "rankcoins", "rankpobre", "rank_pobre"
];

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function resolveOption(message) {
    const command = normalize(message.command);
    const args = [...(message.args || [])].map(normalize);
    const legacyCommands = {
        rankxp: "xp",
        rankingxp: "xp",
        "ranking-xp": "xp",
        rankativos: "ativos",
        rankingativos: "ativos",
        "ranking-ativos": "ativos",
        rankatividade: "ativos",
        rankativo: "ativos",
        rankinatividade: "ativos",
        rank_ativos: "ativos",
        rankinativos: "inativos",
        rank_inativos: "inativos",
        rankrico: "rico",
        rank_rico: "rico",
        rankcoins: "rico",
        rankpobre: "pobre",
        rank_pobre: "pobre"
    };

    let option = legacyCommands[command] || args.shift() || "rico";
    if (["rankxp", "rankingxp", "ranking-xp"].includes(command)) {
        if (["pior", "piores", "notxp"].includes(args[0])) option = "notxp";
        else if (args[0] === "list" || args[0] === "lista") option = "xplist";
    }

    const suffix = args[0];
    const list = args.some(argument => ["list", "lista"].includes(argument)) ||
        ["xplist", "ativoslist"].includes(option);
    if (option === "xp" && ["piores", "pior", "notxp"].includes(suffix)) option = "notxp";
    if (option === "xp" && ["melhores", "melhor"].includes(suffix)) option = "xp";
    if (option === "ativos" && ["piores", "pior", "menos"].includes(suffix)) {
        return { type: "activity", order: "poor", list };
    }

    if (option === "xplist") return { type: "xp", order: "rich", list: true };
    if (option === "ativoslist") return { type: "activity", order: "rich", list: true };
    if (option === "inativoslist") return { type: "activity", order: "poor", list: true };
    if (option === "xp") return { type: "xp", order: "rich", list };
    if (option === "notxp") return { type: "xp", order: "poor", list };
    if (option === "ativos") return { type: "activity", order: "rich", list };
    if (option === "inativos") return { type: "activity", order: "poor", list };
    if (option === "rico") return { type: "rich", order: "rich", list };
    if (option === "pobre") return { type: "rich", order: "poor", list };
    return null;
}

function entryName(entry) {
    return entry.displayName || entry.name || entry.username || entry.userId;
}

function sortEntries(entries, type, order) {
    const metric = type === "xp" ? "xp" : type === "activity" ? "total" : "balance";
    return entries.sort((a, b) => {
        const difference = (Number(a[metric]) || 0) - (Number(b[metric]) || 0);
        return (order === "poor" ? difference : -difference) ||
            String(entryName(a)).localeCompare(String(entryName(b)));
    });
}

async function includeWhatsAppMembers(message, entries, type) {
    if (message.platform !== "whatsapp") return entries;
    if (!String(message.chatId || "").endsWith("@g.us")) {
        throw new Error("Use esta opção em um grupo do WhatsApp.");
    }

    const sock = global.whatsappSock;
    if (!sock || typeof sock.groupMetadata !== "function") {
        throw new Error("O suporte ao WhatsApp não está disponível no momento.");
    }

    let metadata;
    try {
        metadata = await sock.groupMetadata(message.chatId);
    } catch (error) {
        console.error("[RANK] Falha ao buscar membros do grupo WhatsApp:", error);
        throw new Error("Não foi possível carregar os membros deste grupo. Tente novamente mais tarde.");
    }

    if (!Array.isArray(metadata?.participants)) {
        throw new Error("A lista de membros deste grupo do WhatsApp está indisponível.");
    }

    return metadata.participants.map((participant, index) => {
        const identifiers = [participant.id, participant.lid, participant.phoneNumber].filter(Boolean);
        const recorded = entries.find(entry =>
            identifiers.some(identifier => sameUserId(identifier, entry.userId))
        );
        const mentionId = cleanJid(String(participant.phoneNumber || participant.id || participant.lid || ""));
        const userId = String(participant.id || participant.lid || participant.phoneNumber || `membro-${index + 1}`);
        const defaultData = type === "xp"
            ? { xp: 0, level: 1 }
            : type === "activity"
                ? { total: 0, dailyTotal: 0, messages: 0, commands: 0, stickers: 0, files: 0 }
                : { balance: 0 };

        return {
            ...defaultData,
            ...(recorded || {}),
            userId,
            mentionId,
            displayName: participant.name || participant.notify || entryName(recorded || {}) || userId
        };
    });
}

async function getListEntries(message, type, order) {
    let entries;
    if (type === "xp") {
        entries = xp.ranking(message).map(user => ({
            ...user,
            level: xp.levelForXp(user.xp).level
        }));
    } else if (type === "activity") {
        entries = activity.ranking(message)?.users || [];
    } else {
        entries = economy.getRanking(message, order, Infinity);
    }

    entries = await includeWhatsAppMembers(message, entries, type);
    return sortEntries(entries, type, order);
}

function listText(message, entries, type, order) {
    const title = type === "xp"
        ? "RANKING DE XP"
        : type === "activity"
            ? "RANKING DE ATIVIDADE"
            : "RANKING DE SATCOINS";
    const scope = economy.getScope(message);
    const mentions = [];
    const rows = entries.map((entry, index) => {
        const mentionId = entry.mentionId;
        const name = mentionId?.includes("@")
            ? `@${mentionId.split("@")[0].split(":")[0]}`
            : entryName(entry);
        if (mentionId?.includes("@")) mentions.push(mentionId);

        const value = type === "xp"
            ? `${Number(entry.xp) || 0} XP • nível ${entry.level || 1}`
            : type === "activity"
                ? `${Number(entry.total) || 0} atividades (💬 ${Number(entry.messages) || 0}, ⚙️ ${Number(entry.commands) || 0}, 🎨 ${Number(entry.stickers) || 0}, 📎 ${Number(entry.files) || 0})`
                : economy.formatMoney(entry.balance);
        return `${index + 1}. ${name} — ${value}`;
    });
    const ordering = type === "activity"
        ? (order === "poor" ? "menos ativos" : "mais ativos")
        : `${order === "poor" ? "menores" : "maiores"} valores`;
    return {
        text: [
            `📊 ${title} — ${ordering}`,
            `🏠 ${scope?.name || message.chatName || "Grupo"}`,
            `👥 Total: ${entries.length}`,
            "",
            ...rows
        ].join("\n"),
        mentions: [...new Set(mentions)]
    };
}

module.exports = {
    name: "rank",
    aliases,
    category: "adm/RP",
    description: `🏆 Consulte os rankings de XP, atividade e satcoins do grupo ou servidor atual. As opções sem list enviam um banner com até cinco posições.

📈 XP
• {prefix}rank xp — cinco maiores valores de XP.
• {prefix}rank notxp — cinco menores valores de XP.

📊 Atividade
• {prefix}rank ativos — cinco membros com mais atividades registradas.
• {prefix}rank inativos — cinco membros com menos atividades entre os que têm registro. Não inclui membros sem atividade salva.

💰 Satcoins
• {prefix}rank rico — cinco maiores saldos.
• {prefix}rank pobre — cinco menores saldos registrados.

📋 Listas completas
Acrescente list a qualquer opção para listar todos os membros envolvidos, por exemplo:
{prefix}rank xp list
{prefix}rank notxp list
{prefix}rank ativos list
{prefix}rank inativos list
{prefix}rank rico list
{prefix}rank pobre list

🔐 Todas as opções list são exclusivas para administradores, pois podem mencionar todos os membros. No WhatsApp, as listas incluem todos os membros atuais do grupo e mostram valores zerados quando não houver dados salvos. No Telegram e no Discord, mostram somente os membros que possuem registro nos dados JSON.

Os comandos antigos rankxp, rankativos, rankrico, rank_rico, rankcoins, rankpobre e rank_pobre continuam como atalhos para as opções correspondentes.`,
    usage: "{prefix}rank [texto]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O ranking só funciona em grupos ou servidores." });
        }

        if (normalize(message.command) === "rank" && !message.args?.length) {
            return message.reply({
                text: [
                    "📊 Como usar o rank:",
                    `${message.prefix}rank xp | notxp — maiores ou menores valores de XP`,
                    `${message.prefix}rank ativos — membros mais ativos`,
                    `${message.prefix}rank inativos — menos ativos registrados`,
                    `${message.prefix}rank rico | pobre — maiores ou menores saldos`,
                    `Acrescente list a qualquer opção para listar todos (somente administradores).`
                ].join("\n")
            });
        }

        if (["help", "ajuda"].includes(normalize(message.args?.[0]))) {
            return message.reply({
                text: [
                    "📊 RANKINGS",
                    "",
                    `${message.prefix}rank xp — cinco maiores valores de XP`,
                    `${message.prefix}rank notxp — cinco menores valores de XP`,
                    `${message.prefix}rank ativos — cinco membros mais ativos`,
                    `${message.prefix}rank inativos — cinco menos ativos registrados`,
                    `${message.prefix}rank rico / ${message.prefix}rank pobre — maiores ou menores saldos`,
                    `${message.prefix}rank xp|notxp|ativos|inativos|rico|pobre list — lista completa (somente administradores)`
                ].join("\n")
            });
        }

        const option = resolveOption(message);
        if (!option) {
            return message.reply({
                text: `❌ Opção inválida. Use ${message.prefix}rank xp|notxp|xplist|ativos|ativoslist|inativos|inativos list|rico|pobre [list].`
            });
        }
        if (option.list && !economyAdmin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem usar a versão list dos rankings, pois ela pode mencionar todos os membros." });
        }

        if (option.type === "xp") {
            const data = xp.load(message);
            if (!data?.enabled) {
                return message.reply({ text: "ℹ️ O sistema de XP está desativado neste grupo/servidor." });
            }
        } else if (option.type === "activity") {
            const data = activity.ranking(message);
            if (!data?.enabled) {
                return message.reply({ text: "ℹ️ O sistema de atividade está desativado neste grupo/servidor." });
            }
        } else if (!economy.isEnabled(message)) {
            return message.reply({ text: "ℹ️ O sistema de economia está desativado neste grupo/servidor." });
        }

        if (option.list) {
            let entries;
            try {
                entries = await getListEntries(message, option.type, option.order);
            } catch (error) {
                return message.reply({ text: `❌ ${error.message}` });
            }
            if (!entries.length) {
                return message.reply({ text: "ℹ️ Ainda não há registros neste ranking." });
            }
            return message.reply(listText(message, entries, option.type, option.order));
        }

        if (option.type === "activity" && !activity.ranking(message)?.users.length) {
            return message.reply({ text: "ℹ️ Ainda não há atividade registrada neste grupo/servidor." });
        }

        const result = await renderRanking(message, option.type, option.order);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        const fileName = option.type === "xp"
            ? "rankxp.png"
            : option.type === "activity"
                ? "rankatividade.png"
                : "rankcoins.png";
        return message.replyImg({ image: result.buffer, caption: result.caption, fileName });
    }
};
