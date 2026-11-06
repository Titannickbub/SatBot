const economy = require("../../functions/economy");
const signalSearchBanner = require("../../functions/signalSearchBanner");

const LEVEL_ALIASES = new Map([
    ["recruta", "recruta"],
    ["recruit", "recruta"],
    ["especializada", "especializada"],
    ["especializado", "especializada"],
    ["especial", "especializada"],
    ["local", "local"]
]);

const LOCAL_RARITY_LABELS = {
    comum: "Comum",
    incomum: "Incomum",
    raro: "Raro",
    epico: "Épico",
    lendario: "Lendário"
};

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
    description: "Faça buscas de sinais para obter SatCoins, itens, resets e cosméticos.",
    usage: "{prefix}buscasinais help",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A busca de sinais só funciona em grupos ou servidores." });
        }

        const [rawLevel, rawQuantity] = message.args || [];
        const prefix = message.prefix || "!";
        if (normalizeText(rawLevel) === "itens" || normalizeText(rawLevel) === "premios") {
            return replyPrizeCatalog(message, rawQuantity);
        }
        const levelKey = normalizeLevel(rawLevel);
        if (!rawLevel) {
            return replyHighlights(message);
        }
        if (["help", "ajuda"].includes(normalizeText(rawLevel)) || !levelKey) {
            if (!["help", "ajuda"].includes(normalizeText(rawLevel))) {
                return message.reply({
                    text: `❌ Modalidade inválida. Use ${prefix}buscasinais recruta, ${prefix}buscasinais especializada ou ${prefix}buscasinais local.`
                });
            }
            return replyHelp(message, prefix);
        }

        const quantity = rawQuantity === undefined ? 1 : ["10", "x10", "dez"].includes(normalizeText(rawQuantity)) ? 10 : null;
        if (quantity === null) {
            return message.reply({ text: `❌ Quantidade inválida. Use ${prefix}buscasinais ${levelKey} ou ${prefix}buscasinais ${levelKey} x10.` });
        }

        const result = levelKey === "local"
            ? economy.searchLocalSignals(message, quantity)
            : economy.searchSignals(message, levelKey, quantity);
        if (!result.searched) {
            if (result.reason === "disabled") {
                return message.reply({ text: "❌ A Busca Local ainda não foi configurada e ativada pelos administradores deste grupo/servidor." });
            }
            if (result.reason === "unavailable-prizes") {
                return message.reply({ text: "❌ A Busca Local está sem prêmios disponíveis. Avise os administradores para revisar a configuração." });
            }
            if (result.reason === "missing-account") {
                return message.reply({ text: "❌ Não foi possível localizar sua conta nesta comunidade. Tente novamente." });
            }
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

function replyHelp(message, prefix) {
    const state = economy.getSignalSearchState(message);
    const local = economy.getLocalSignalSearch(message);
    const recruit = state.levels.recruta;
    const specialized = state.levels.especializada;
    const localGuarantees = Object.entries(local.pullsUntilGuarantee)
        .filter(([, pulls]) => pulls !== null)
        .map(([rarity, pulls]) => `${LOCAL_RARITY_LABELS[rarity]} em até ${pulls} busca(s)`);
    const lines = [
        "📝 Escolha uma modalidade:",
        `• Recruta: ${economy.formatMoney(recruit.price)} por busca`,
        "  Sorteia SatCoins ou resets da Loja do Bot",
        `  Reset de trabalho garantido em até ${recruit.pullsUntilWorkReset} busca(s)`,
        `  Prêmio épico garantido em até ${recruit.pullsUntilEpic} busca(s)`,
        `• Especializada: ${economy.formatMoney(specialized.price)} por busca`,
        "  Sorteia SatCoins, resets da Loja do Bot ou cosméticos",
        `  Prêmio épico garantido em até ${specialized.pullsUntilEpic} busca(s)`,
        `• Local: ${economy.formatMoney(local.price)} por busca · ${local.enabled ? "ativa" : "desativada"}`,
        "  Prêmios, chances e garantias personalizados pelos administradores deste grupo/servidor",
        ...(localGuarantees.length ? [`  Garantias: ${localGuarantees.join("; ")}`] : []),
        "",
        "Consulte os itens possíveis:",
        `${prefix}buscasinais itens`,
        `${prefix}buscasinais itens recruta|especializada|local`,
        "",
        "🔟 Faça dez buscas de uma vez acrescentando x10; o custo é dez vezes o valor unitário.",
        "📌 O pagamento sai da carteira, nunca do cofre. As garantias são independentes por modalidade.",
        "Cosméticos repetidos e resets indisponíveis são convertidos em 50% do preço da loja.",
        "",
        "Exemplos (1 busca):",
        `${prefix}buscasinais recruta`,
        `${prefix}buscasinais especializada`,
        `${prefix}buscasinais local`,
        "",
        "Exemplos (10 buscas):",
        `${prefix}buscasinais recruta x10`,
        `${prefix}buscasinais especializada x10`,
        `${prefix}buscasinais local x10`
    ];
    return replyNativeText(message, "✦ Busca de Sinais", lines.join("\n"), 0xb68bff);
}

async function replyPrizeCatalog(message, rawLevel) {
    const level = rawLevel ? normalizeLevel(rawLevel) : null;
    if (rawLevel && normalizeText(rawLevel) !== "todos" && !level) {
        return replyNativeText(
            message,
            "✦ Prêmios da Busca de Sinais",
            `Modalidade inválida. Use ${message.prefix || "!"}buscasinais itens recruta, especializada ou local.`
        );
    }

    const levels = level ? [level] : ["recruta", "especializada", "local"];
    const state = economy.getSignalSearchState(message);
    const local = economy.getLocalSignalSearch(message);
    const sections = levels.flatMap((key, index) => [
        ...(index ? [""] : []),
        ...getPrizeCatalogSection(key, state, local)
    ]);
    const chunks = chunkLines(sections, 3200);
    for (let index = 0; index < chunks.length; index++) {
        const title = chunks.length > 1
            ? `✦ Prêmios possíveis (${index + 1}/${chunks.length})`
            : "✦ Prêmios possíveis";
        await replyNativeText(message, title, chunks[index]);
    }
}

function getPrizeCatalogSection(level, state, local) {
    if (level === "recruta") {
        const resets = economy.getStoreItems()
            .filter(item => !item.product && item.key !== "all" && item.key !== "shield");
        const epicResets = economy.getStoreItems()
            .filter(item => item.rarity === economy.ITEM_RARITY.EPIC && !item.product);
        return [
            `👤 RECRUTA`,
            `Custo: ${economy.formatMoney(state.levels.recruta.price)} por busca`,
            "",
            "Chances por busca:",
            `• 70% — SatCoins: ${economy.formatMoney(economy.SIGNAL_SEARCH_LEVELS.recruta.cashMin)} a ${economy.formatMoney(economy.SIGNAL_SEARCH_LEVELS.recruta.cashMax)}`,
            "• 30% — reset da Loja do Bot",
            ...formatWrappedNames("Resets possíveis:", resets.map(item => item.name)),
            "",
            `Garantias: resetar trabalho em até ${state.levels.recruta.pullsUntilWorkReset} busca(s).`,
            ...formatWrappedNames(`Prêmio épico (até ${state.levels.recruta.pullsUntilEpic} buscas):`, epicResets.map(item => item.name))
        ];
    }
    if (level === "especializada") {
        const resets = economy.getStoreItems()
            .filter(item => !item.product && item.key !== "all" && item.key !== "shield");
        const epicResets = economy.getStoreItems()
            .filter(item => item.rarity === economy.ITEM_RARITY.EPIC && !item.product)
            .map(item => item.name);
        const epicCosmetics = getCosmeticPrizeNames(economy.ITEM_RARITY.EPIC);
        const cosmeticGroups = getCosmeticPrizeGroups();
        return [
            "🛡️ ESPECIALIZADA",
            `Custo: ${economy.formatMoney(state.levels.especializada.price)} por busca`,
            "",
            "Chances por busca:",
            `• 55% — SatCoins: ${economy.formatMoney(economy.SIGNAL_SEARCH_LEVELS.especializada.cashMin)} a ${economy.formatMoney(economy.SIGNAL_SEARCH_LEVELS.especializada.cashMax)}`,
            "• 20% — reset da Loja do Bot",
            "• 25% — cosmético",
            "",
            ...formatWrappedNames("Resets possíveis:", resets.map(item => item.name)),
            "",
            "Cosméticos possíveis:",
            ...formatWrappedNames("Fundos:", cosmeticGroups.backgrounds),
            ...formatWrappedNames("Outlines:", cosmeticGroups.outlines),
            "",
            ...formatWrappedNames(
                `Garantia épica (até ${state.levels.especializada.pullsUntilEpic} buscas):`,
                [...epicResets, ...epicCosmetics]
            )
        ];
    }

    const lines = [
        "🏠 BUSCA LOCAL",
        `Custo: ${economy.formatMoney(local.price)} por busca · ${local.enabled ? "ativa" : "desativada"}`,
        "Prêmios e chances definidos pelos administradores:",
        ""
    ];
    for (const rarity of economy.LOCAL_SIGNAL_RARITIES) {
        const tier = local.tiers[rarity];
        if (!tier.chance) continue;
        const prizes = [];
        if (tier.cashMin !== null && tier.cashMax !== null) {
            prizes.push(`SatCoins ${economy.formatMoney(tier.cashMin)}–${economy.formatMoney(tier.cashMax)}`);
        }
        for (const key of tier.botItems) {
            const item = local.botItems.find(candidate => candidate.key === key);
            if (item) prizes.push(item.name);
        }
        for (const id of tier.marketItems) {
            const item = local.marketItems.find(candidate => candidate.id === id && candidate.quantity !== 0);
            if (item) prizes.push(item.name);
        }
        for (const key of tier.backgrounds) {
            const item = local.backgrounds.find(candidate => candidate.key === key);
            if (item) prizes.push(`Fundo ${item.name}`);
        }
        for (const key of tier.outlines) {
            const item = local.outlines.find(candidate => candidate.key === key);
            if (item) prizes.push(`Outline ${item.name}`);
        }
        const guarantee = tier.guaranteeAfter
            ? `Garantia em até ${local.pullsUntilGuarantee[rarity]} busca(s).`
            : "";
        lines.push(`${LOCAL_RARITY_LABELS[rarity]} · ${tier.chance}%`);
        if (guarantee) lines.push(guarantee);
        lines.push(...formatWrappedNames("Prêmios:", prizes.length ? prizes : ["nenhum disponível"]));
        lines.push("");
    }
    if (!local.tiers || !economy.LOCAL_SIGNAL_RARITIES.some(rarity => local.tiers[rarity].chance > 0)) {
        lines.push("Nenhum prêmio configurado.");
    }
    return lines;
}

function getCosmeticPrizeNames(rarity) {
    const groups = getCosmeticPrizeGroups(rarity);
    return [
        ...groups.backgrounds.map(name => `Fundo ${name}`),
        ...groups.outlines.map(name => `Outline ${name}`)
    ];
}

function getCosmeticPrizeGroups(rarity) {
    return {
        backgrounds: Object.values(economy.PROFILE_BACKGROUNDS)
            .filter(item => !rarity || item.rarity === rarity)
            .map(item => item.label),
        outlines: Object.values(economy.PROFILE_OUTLINES)
            .filter(item => !rarity || item.rarity === rarity)
            .map(item => item.label)
    };
}

function formatWrappedNames(label, names, maxLength = 68) {
    const lines = [label];
    if (!names.length) {
        lines.push("  Nenhum configurado.");
        return lines;
    }

    let line = "  ";
    for (const name of names) {
        const separator = line.trim() ? ", " : "";
        const entry = `${separator}${name}`;
        if (line.length + entry.length > maxLength && line.trim()) {
            lines.push(line);
            line = `  ${name}`;
        } else {
            line += entry;
        }
    }
    if (line.trim()) lines.push(line);
    return lines;
}

function chunkLines(lines, maxLength) {
    const chunks = [];
    let chunk = "";
    for (const line of lines) {
        const pieces = line.length > maxLength
            ? line.match(new RegExp(`.{1,${maxLength}}`, "g")) || [line]
            : [line];
        for (const piece of pieces) {
            const next = chunk ? `${chunk}\n${piece}` : piece;
            if (next.length > maxLength && chunk) {
                chunks.push(chunk);
                chunk = piece;
            } else {
                chunk = next;
            }
        }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
}

function rewardLine(reward, index, isLocal = false) {
    const position = index === null ? "" : `${index + 1}. `;
    const rarity = isLocal ? ` · ${LOCAL_RARITY_LABELS[reward.rarity] || reward.rarity}` : "";
    const guarantee = isLocal && reward.guarantee
        ? ` · GARANTIA ${LOCAL_RARITY_LABELS[reward.guarantee] || reward.guarantee}`
        : reward.guarantee === "epic"
            ? " · GARANTIA ÉPICA"
            : reward.guarantee === "work"
                ? " · GARANTIA RESET DE TRABALHO"
                : "";
    if (reward.type === "money") {
        return `${position}💰 ${reward.name}: ${economy.formatMoney(reward.amount)}${rarity}${reward.converted ? " · conversão de item (50%)" : ""}${guarantee}`;
    }
    if (reward.type === "reset") {
        return `${position}🔄 ${reward.name} aplicado${rarity}${guarantee}`;
    }
    return `${position}🎨 ${reward.name} adicionado à coleção${rarity}${guarantee}`;
}

async function replyHighlights(message) {
    try {
        const cosmetics = economy.getProfileCosmetics(message);
        const image = await signalSearchBanner.renderHighlightsBanner(cosmetics);
        const prefix = message.prefix || "!";
        const localSearch = economy.getLocalSignalSearch(message);
        return await message.replyImg({
            image,
            caption: highlightsCaption(message.platform, prefix, localSearch.price),
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

function highlightsCaption(platform, prefix, localPrice) {
    const examples = [
        [`${prefix}buscasinais recruta`, economy.SIGNAL_SEARCH_LEVELS.recruta.price],
        [`${prefix}buscasinais especializada`, economy.SIGNAL_SEARCH_LEVELS.especializada.price],
        [`${prefix}buscasinais local`, localPrice],
        [`${prefix}buscasinais recruta x10`, economy.SIGNAL_SEARCH_LEVELS.recruta.price * 10],
        [`${prefix}buscasinais especializada x10`, economy.SIGNAL_SEARCH_LEVELS.especializada.price * 10],
        [`${prefix}buscasinais local x10`, localPrice * 10]
    ];
    const formatExample = ([command, amount]) => [
        platform === "telegram"
            ? `<code>${escapeHtml(command)}</code>`
            : `\`${command}\``,
        `💰 ${formatSignalSearchPrice(amount)}`
    ].join("\n");
    const infoCommands = platform === "telegram"
        ? [
            `Informações e regras: <code>${escapeHtml(prefix)}buscasinais ajuda</code>`,
            `Itens possíveis: <code>${escapeHtml(prefix)}buscasinais itens</code> (ou <code>${escapeHtml(prefix)}buscasinais itens recruta|especializada|local</code>)`
        ]
        : [
            `Informações e regras: \`${prefix}buscasinais ajuda\``,
            `Itens possíveis: \`${prefix}buscasinais itens\` (ou \`${prefix}buscasinais itens recruta|especializada|local\`)`
        ];
    if (platform === "telegram") {
        return [
            "<b>✦ Busca de Sinais</b>",
            "Recruta sorteia dinheiro ou resets; Especializada também pode dar cosméticos; a Local tem prêmios definidos pelos administradores.",
            "",
            ...infoCommands,
            "",
            "<b>Comando</b>",
            examples.map(formatExample).join("\n\n")
        ].join("\n");
    }
    if (platform === "discord") {
        return [
            "## ✦ Busca de Sinais",
            "Recruta sorteia dinheiro ou resets; Especializada também pode dar cosméticos; a Local tem prêmios definidos pelos administradores.",
            "",
            ...infoCommands,
            "",
            "**Comando**",
            examples.map(formatExample).join("\n\n")
        ].join("\n");
    }
    return [
        "*✦ Busca de Sinais*",
        "Recruta sorteia dinheiro ou resets; Especializada também pode dar cosméticos; a Local tem prêmios definidos pelos administradores.",
        "",
        ...infoCommands,
        "",
        "*Comando*",
        examples.map(formatExample).join("\n\n")
    ].join("\n");
}

function formatSignalSearchPrice(amount) {
    return economy.formatMoney(amount).replace(/💷/g, " SatCoins");
}

async function replyResults(message, result) {
    if (result.level === "local") return replyLocalResults(message, result);
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

async function replyLocalResults(message, result) {
    const isBatch = result.quantity === 10;
    const title = `Busca Local${isBatch ? " x10" : ""}`;
    const guaranteeLines = Object.entries(result.state.pullsUntilGuarantee)
        .filter(([, pulls]) => pulls !== null)
        .map(([rarity, pulls]) => `Garantia ${LOCAL_RARITY_LABELS[rarity]} em até ${pulls} busca(s)`);
    const lines = [
        `✦ ${title} concluída`,
        `Custo: ${economy.formatMoney(result.price)}`,
        "",
        ...result.rewards.map((reward, index) => rewardLine(reward, isBatch ? index : null, true)),
        "",
        `Saldo na carteira: ${economy.formatMoney(result.balance)}`,
        ...guaranteeLines
    ];
    try {
        const cosmetics = economy.getProfileCosmetics(message);
        const image = await signalSearchBanner.renderResultBanner(result, cosmetics);
        return await message.replyImg({
            image,
            caption: nativeCaption(message.platform, [
                [`**✦ ${title} concluída**`, `<b>✦ ${escapeHtml(title)} concluída</b>`, `*✦ ${title} concluída*`],
                `${isBatch ? "10 sinais revelados" : "Sinal revelado"} · Custo ${economy.formatMoney(result.price)}`,
                `Saldo na carteira: ${economy.formatMoney(result.balance)}`,
                ...guaranteeLines
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
