const economy = require("../../functions/economy");
const signalSearchBanner = require("../../functions/signalSearchBanner");

const LEVEL_ALIASES = new Map([
    ["recruta", "recruta"],
    ["recruit", "recruta"],
    ["especializada", "especializada"],
    ["especializado", "especializada"],
    ["especial", "especializada"]
]);

module.exports = {
    name: "buscasinais",
    aliases: [
        "busca",
        "sinais",
        "buscar",
        "buscarsinais",
        "buscarsinal",
        "buscasinal",
        "busca_sinais",
        "buscar_sinais",
        "buscar_sinal",
        "busca_sinal"
    ],
    category: "economia",
    description: `✦ Faça buscas de sinais e receba SatCoins, resets ou cosméticos.

{prefix}buscasinais recruta [x10]
{prefix}buscasinais especializada [x10]

Busca Recruta: ${economy.formatMoney(economy.SIGNAL_SEARCH_LEVELS.recruta.price)} por tentativa; garante um reset de trabalho a cada 5 e um épico a cada 10.
Busca Especializada: ${economy.formatMoney(economy.SIGNAL_SEARCH_LEVELS.especializada.price)} por tentativa; inclui prêmios em dinheiro e cosméticos, com um épico garantido a cada 10.
A busca x10 custa dez vezes o valor unitário. Contadores são separados por nível. Recompensas repetidas ou resets indisponíveis convertem-se em 50% do preço da loja.`,
    usage: "{prefix}buscasinais [recruta|especializada] [x10]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A busca de sinais só funciona em grupos ou servidores." });
        }

        const [rawLevel, rawQuantity] = message.args || [];
        const prefix = message.prefix || "!";
        const state = economy.getSignalSearchState(message);
        const levelKey = normalizeLevel(rawLevel);
        if (!rawLevel) {
            return replyHighlights(message);
        }
        if (["help", "ajuda"].includes(normalizeText(rawLevel)) || !levelKey) {
            if (!["help", "ajuda"].includes(normalizeText(rawLevel))) {
                return message.reply({
                    text: `❌ Nível inválido. Use ${prefix}buscasinais recruta ou ${prefix}buscasinais especializada.`
                });
            }
            return replyHelp(message, state, prefix);
        }

        const quantity = rawQuantity === undefined ? 1 : ["10", "x10", "dez"].includes(normalizeText(rawQuantity)) ? 10 : null;
        if (quantity === null) {
            return message.reply({ text: `❌ Quantidade inválida. Use ${prefix}buscasinais ${levelKey} ou ${prefix}buscasinais ${levelKey} x10.` });
        }

        const result = economy.searchSignals(message, levelKey, quantity);
        if (!result.searched) {
            if (result.reason === "insufficient-balance") {
                return message.reply({
                    text: `❌ Saldo insuficiente. Esta busca custa ${economy.formatMoney(result.price)} e sua carteira tem ${economy.formatMoney(result.balance)}. O saldo do cofre não pode ser usado.`
                });
            }
            return message.reply({ text: "❌ Não foi possível fazer esta busca. Verifique o nível e a quantidade." });
        }
        return replyResults(message, result);
    }
};

function normalizeText(value) {
    return String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function normalizeLevel(value) {
    return LEVEL_ALIASES.get(normalizeText(value)) || null;
}

function replyHelp(message, state, prefix) {
    const recruit = state.levels.recruta;
    const specialized = state.levels.especializada;
    const lines = [
        `Busca Recruta: ${economy.formatMoney(recruit.price)} por tentativa`,
        `• Reset de trabalho garantido em até ${recruit.pullsUntilWorkReset} busca(s)`,
        `• Épico garantido em até ${recruit.pullsUntilEpic} busca(s)`,
        `Busca Especializada: ${economy.formatMoney(specialized.price)} por tentativa`,
        `• Épico garantido em até ${specialized.pullsUntilEpic} busca(s)`,
        "• Prêmios em dinheiro maiores e cosméticos",
        "Os contadores de garantia são separados por nível.",
        "x10 custa dez vezes o valor unitário. Itens repetidos ou resets indisponíveis viram 50% do preço da loja.",
        "",
        `Use ${prefix}buscasinais recruta [x10]`,
        `Use ${prefix}buscasinais especializada [x10]`
    ];
    return replyNativeText(message, "✦ Busca de Sinais", lines.join("\n"), 0xb68bff);
}

function rewardLine(reward, index) {
    const position = index === null ? "" : `${index + 1}. `;
    const guarantee = reward.guarantee === "epic"
        ? " · GARANTIA ÉPICA"
        : reward.guarantee === "work"
            ? " · GARANTIA RESET DE TRABALHO"
            : "";
    if (reward.type === "money") {
        return `${position}💰 ${reward.name}: ${economy.formatMoney(reward.amount)}${reward.converted ? " · conversão de item (50%)" : ""}${guarantee}`;
    }
    if (reward.type === "reset") {
        return `${position}🔄 ${reward.name} aplicado${guarantee}`;
    }
    return `${position}🎨 ${reward.name} adicionado à coleção${guarantee}`;
}

async function replyHighlights(message) {
    try {
        const cosmetics = economy.getProfileCosmetics(message);
        const image = await signalSearchBanner.renderHighlightsBanner(cosmetics);
        return await message.replyImg({
            image,
            caption: nativeCaption(message.platform, [
                ["**✦ Destaques atuais da Busca de Sinais**", "<b>✦ Destaques atuais da Busca de Sinais</b>", "*✦ Destaques atuais da Busca de Sinais*"],
                "Fundo RGB e Outline RGB são os prêmios épicos em destaque.",
                "Use buscasinais recruta ou buscasinais especializada para começar."
            ]),
            parse_mode: message.platform === "telegram" ? "HTML" : undefined,
            fileName: "busca-sinais-destaques.png"
        });
    } catch (error) {
        console.error("[BUSCA-SINAIS] Falha ao gerar ou enviar os destaques:", error.message || error);
        return replyNativeText(
            message,
            "✦ Destaques da Busca de Sinais",
            "Não foi possível gerar o banner dos destaques agora. Tente novamente em alguns instantes."
        );
    }
}

async function replyResults(message, result) {
    const isBatch = result.quantity === 10;
    const state = result.state.levels[result.level];
    const title = `${result.level === "recruta" ? "Busca Recruta" : "Busca Especializada"}${isBatch ? " x10" : ""}`;
    const lines = [
        `✦ ${title} concluída`,
        `Custo: ${economy.formatMoney(result.price)}`,
        "",
        ...result.rewards.map((reward, index) => rewardLine(reward, isBatch ? index : null)),
        "",
        `Saldo na carteira: ${economy.formatMoney(result.balance)}`,
        `Épico garantido em até ${state.pullsUntilEpic} busca(s).`
    ];
    if (result.level === "recruta") {
        lines.push(`Reset de trabalho garantido em até ${state.pullsUntilWorkReset} busca(s).`);
    }
    try {
        const cosmetics = economy.getProfileCosmetics(message);
        const image = await signalSearchBanner.renderResultBanner(result, cosmetics);
        return await message.replyImg({
            image,
            caption: nativeCaption(message.platform, [
                [`**✦ ${title} concluída**`, `<b>✦ ${escapeHtml(title)} concluída</b>`, `*✦ ${title} concluída*`],
                `${isBatch ? "10 sinais revelados" : "Sinal revelado"} · Custo ${economy.formatMoney(result.price)}`,
                `Saldo na carteira: ${economy.formatMoney(result.balance)}`,
                `Épico garantido em até ${state.pullsUntilEpic} busca(s)${result.level === "recruta" ? ` · Reset de trabalho em até ${state.pullsUntilWorkReset}` : ""}.`
            ]),
            parse_mode: message.platform === "telegram" ? "HTML" : undefined,
            fileName: "busca-sinais-resultado.png"
        });
    } catch (error) {
        console.error("[BUSCA-SINAIS] Falha ao gerar ou enviar o banner do resultado:", error.message || error);
        return replyNativeText(
            message,
            `✦ ${title} concluída`,
            `${lines.slice(1).join("\n")}\n\nO banner não pôde ser enviado; estes são os resultados em texto.`
        );
    }
}

function nativeCaption(platform, lines) {
    const title = lines[0][platform === "discord" ? 0 : platform === "telegram" ? 1 : 2];
    return [title, ...lines.slice(1)].join("\n");
}

function replyNativeText(message, title, body, color = 0xb68bff) {
    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color,
                title,
                description: body
            }
        });
    }
    if (message.platform === "telegram") {
        return message.reply({
            text: `<b>${escapeHtml(title)}</b>\n${escapeHtml(body)}`,
            parse_mode: "HTML"
        });
    }
    return message.reply({ text: `*${title}*\n${body}` });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
