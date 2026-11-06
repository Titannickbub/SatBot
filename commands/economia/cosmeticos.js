const economy = require("../../functions/economy");
const imageBanner = require("../../functions/imageBanner");

const RARITY_LABELS = {
    [economy.ITEM_RARITY.COMMON]: "Comum",
    [economy.ITEM_RARITY.UNCOMMON]: "Incomum",
    [economy.ITEM_RARITY.RARE]: "Raro",
    [economy.ITEM_RARITY.EPIC]: "Épico",
    [economy.ITEM_RARITY.LEGENDARY]: "Lendário"
};

module.exports = {
    name: "cosmeticos",
    aliases: ["cosmético", "cosmetico", "cosméticos", "cosmetics"],
    category: "economia",
    description: "Consulte e equipe fundos e contornos cosméticos no seu perfil.",
    usage: "{prefix}cosmeticos help",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ Os cosméticos só funcionam em grupos ou servidores." });
        }

        const [action, category, colorArgument] = message.args || [];
        const prefix = message.prefix || "!";
        const normalizedAction = normalizeCommand(action);

        if (["help", "ajuda"].includes(normalizedAction)) {
            return message.reply({ text: formatHelp(prefix) });
        }

        const state = economy.getProfileCosmetics(message);
        const currentBackground = state.background
            ? economy.PROFILE_BACKGROUNDS[state.background].label
            : "Original";
        const currentOutline = state.outline
            ? economy.PROFILE_OUTLINES[state.outline].label
            : "Padrão (acompanha o fundo)";

        if (normalizedAction === "previa" || normalizedAction === "preview") {
            const type = cosmeticType(category);
            if (!type || !colorArgument) {
                return message.reply({
                    text: `❌ Uso: ${prefix}cosmeticos previa fundo|linha <cor>`
                });
            }
            const key = normalizeCommand(colorArgument);
            const items = type === "background" ? economy.PROFILE_BACKGROUNDS : economy.PROFILE_OUTLINES;
            const item = items[key];
            if (!item) {
                return message.reply({
                    text: `❌ Cor inválida. Use ${prefix}cosmeticos ${type === "background" ? "fundo" : "linha"} para consultar as opções.`
                });
            }
            return sendPreview(message, { ...item, key }, prefix, type, false);
        }

        if (!normalizedAction) {
            return replyMenu(message, currentBackground, currentOutline, prefix);
        }

        const type = cosmeticType(normalizedAction);
        if (!type) {
            return message.reply({
                text: `❌ Use ${prefix}cosmeticos para abrir a loja, ${prefix}cosmeticos fundo para fundos ou ${prefix}cosmeticos linha para outlines.`
            });
        }

        if (!category) {
            return replyCosmeticCatalog(message, state, type, currentBackground, currentOutline, prefix);
        }

        const key = normalizeCommand(category);
        if (["padrao", "original", "default", "resetar"].includes(key)) {
            const result = type === "background"
                ? economy.resetProfileBackground(message)
                : economy.resetProfileOutline(message);
            return message.reply({
                text: result.changed
                    ? type === "background"
                        ? "✅ Fundo original restaurado. Suas cores compradas continuam disponíveis."
                        : "✅ Outline padrão restaurado; ele acompanha a cor do fundo atual. Suas cores compradas continuam disponíveis."
                    : type === "background"
                        ? "ℹ️ Seu perfil já está usando o fundo original."
                        : "ℹ️ O outline já está acompanhando a cor do fundo."
            });
        }

        const items = type === "background" ? economy.PROFILE_BACKGROUNDS : economy.PROFILE_OUTLINES;
        const item = items[key];
        if (!item) {
            return message.reply({
                text: `❌ Opção inválida. Use ${prefix}cosmeticos ${type === "background" ? "fundo" : "linha"} para consultar as opções.`
            });
        }
        const freshState = economy.getProfileCosmetics(message);
        const owned = type === "background" ? freshState.ownedBackgrounds : freshState.ownedOutlines;
        if (!owned.includes(key)) {
            return message.reply({
                text: `🎨 Você ainda não possui ${type === "background" ? "o fundo" : "o outline"} ${item.label}.\nPara comprar, use ${prefix}comprar ${item.id} ou ${prefix}comprar ${type === "background" ? "fundo" : "linha"} ${key}.\nPara ver a prévia, use ${prefix}cosmeticos previa ${type === "background" ? "fundo" : "linha"} ${key}.`
            });
        }

        const result = type === "background"
            ? economy.setProfileBackground(message, key)
            : economy.setProfileOutline(message, key);
        if (!result.purchased) {
            return message.reply({
                text: "❌ Não foi possível aplicar esse cosmético. Tente novamente."
            });
        }
        return message.reply({
            text: type === "background" ? `✅ Fundo ${item.label} aplicado.` : `✅ Outline ${item.label} aplicado às bolhas do perfil.`
        });
    }
};

async function sendPreview(message, item, prefix, type, includePurchaseInfo) {
    try {
        const result = type === "background"
            ? await imageBanner.renderProfileBackgroundPreview(item.key)
            : await imageBanner.renderProfileOutlinePreview(item.key);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        const category = type === "background" ? "fundo" : "linha";
        const purchaseInfo = includePurchaseInfo
            ? `\n\n💳 Para comprar: ${prefix}comprar ${item.id} ou ${prefix}comprar ${category} ${item.key}.\nPreço: ${economy.formatMoney(type === "background" ? economy.getProfileBackgroundPrice(item.key) : economy.getProfileOutlinePrice(item.key))}.${cosmeticIsOwned(message, item.key, type) ? " Você já possui este cosmético; comprá-lo novamente apenas o equipa, sem cobrança." : ""}`
            : "";
        return message.replyImg({
            image: result.buffer,
            caption: `${result.caption}${purchaseInfo}`,
            fileName: `previa-${category}-${item.key}.png`
        });
    } catch (error) {
        console.error("[COSMETICOS] Não foi possível gerar a prévia do cosmético:", error.message || error);
        return message.reply({ text: "❌ Não foi possível gerar a prévia agora. Tente novamente." });
    }
}

function cosmeticIsOwned(message, key, type) {
    const state = economy.getProfileCosmetics(message);
    return (type === "background" ? state.ownedBackgrounds : state.ownedOutlines).includes(key);
}

function replyMenu(message, currentBackground, currentOutline, prefix) {
    const categoryLines = [
        `🎨 Fundos de perfil — ${prefix}cosmeticos fundo`,
        `🖍️ Linha das bolhas — ${prefix}cosmeticos linha`
    ];
    const currentLine = `Fundo: ${currentBackground}\nOutline das bolhas: ${currentOutline}`;
    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: 0x8fb5ff,
                title: "🎨 Loja de cosméticos",
                description: `Personalize seu perfil neste grupo ou servidor.\n\n**Categorias**\n${categoryLines.join("\n")}\n\n${currentLine}`,
                footer: { text: "Escolha uma categoria para consultar os itens." }
            }
        });
    }
    if (message.platform === "telegram") {
        return message.reply({
            text: [
                "<b>🎨 LOJA DE COSMÉTICOS</b>",
                "━━━━━━━━━━━━━━━━━━━━━━",
                "<b>CATEGORIAS</b>",
                ...categoryLines.map(line => `<code>${escapeHtml(line)}</code>`),
                "",
                escapeHtml(currentLine)
            ].join("\n"),
            parse_mode: "HTML"
        });
    }
    return message.reply({
        text: [
            "*🎨 LOJA DE COSMÉTICOS*",
            "━━━━━━━━━━━━━━━━━━━━━━",
            "*CATEGORIAS*",
            ...categoryLines,
            "",
            currentLine
        ].join("\n")
    });
}

function formatHelp(prefix) {
    return [
        "🎨 COSMÉTICOS DO PERFIL",
        "Consulte fundos e a linha colorida das bolhas do perfil.",
        "",
        "Abra a loja e veja as opções:",
        `${prefix}cosmeticos`,
        `${prefix}cosmeticos fundo`,
        `${prefix}cosmeticos linha`,
        "",
        "Veja a prévia de uma cor:",
        `${prefix}cosmeticos previa fundo <cor>`,
        `${prefix}cosmeticos previa linha <cor>`,
        "",
        "Equipe um cosmético que já possui:",
        `${prefix}cosmeticos fundo <cor>`,
        `${prefix}cosmeticos linha <cor>`,
        "A linha pode acompanhar o fundo atual com:",
        `${prefix}cosmeticos linha padrao`,
        "",
        "Para comprar, use o ID na loja ou:",
        `${prefix}comprar fundo <cor>`,
        `${prefix}comprar linha <cor>`,
        `Fundos tradicionais custam ${economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE)} e linhas tradicionais ${economy.formatMoney(economy.PROFILE_OUTLINE_PRICE)}. RGB custa ${economy.formatMoney(economy.getProfileBackgroundPrice("rgb"))} para fundos e ${economy.formatMoney(economy.getProfileOutlinePrice("rgb"))} para linhas. Cosméticos comprados podem ser equipados novamente sem custo.`
    ].join("\n");
}

function replyCosmeticCatalog(message, state, type, currentBackground, currentOutline, prefix) {
    const isBackground = type === "background";
    const category = isBackground ? "fundo" : "linha";
    const itemsByKey = isBackground ? economy.PROFILE_BACKGROUNDS : economy.PROFILE_OUTLINES;
    const ownedItems = isBackground ? state.ownedBackgrounds : state.ownedOutlines;
    const activeItem = isBackground ? state.background : state.outline;
    const groups = new Map();
    for (const [key, item] of Object.entries(itemsByKey)) {
        if (!groups.has(item.rarity)) groups.set(item.rarity, []);
        const selected = activeItem === key;
        const owned = ownedItems.includes(key);
        const price = isBackground
            ? economy.getProfileBackgroundPrice(key)
            : economy.getProfileOutlinePrice(key);
        const status = selected ? "em uso" : owned ? "comprado" : economy.formatMoney(price);
        groups.get(item.rarity).push(
            `${selected ? "✅" : owned ? "☑️" : "🎨"} ID ${item.id}. ${item.label} (${key}) — ${status}`
        );
    }

    const lines = [
        isBackground ? "🎨 FUNDOS DE PERFIL" : "🖍️ OUTLINES DAS BOLHAS DO PERFIL",
        "━━━━━━━━━━━━━━━━━━━━━━",
        isBackground ? `Fundo atual: ${currentBackground}` : `Outline atual: ${currentOutline}`,
        ...[...groups].flatMap(([rarity, items]) => [
            "",
            `Categoria: ${RARITY_LABELS[rarity] || rarity}`,
            ...items
        ]),
        "",
        "Para ver a prévia e aplicar uma opção comprada:",
        `${prefix}cosmeticos ${category} <cor>`,
        `${prefix}cosmeticos previa ${category} <cor>`,
        "",
        `Compre com ${prefix}comprar <id> ou ${prefix}comprar ${category} <cor>.`,
        `As cores tradicionais custam ${economy.formatMoney(isBackground ? economy.PROFILE_BACKGROUND_PRICE : economy.PROFILE_OUTLINE_PRICE)}; RGB custa ${economy.formatMoney(isBackground ? economy.getProfileBackgroundPrice("rgb") : economy.getProfileOutlinePrice("rgb"))}. Opções compradas podem ser equipadas novamente sem custo.`,
        isBackground ? "" : `Use ${prefix}cosmeticos linha padrao para acompanhar a cor do fundo atual.`
    ];

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: isBackground ? 0x8fb5ff : 0xf0a8c6,
                title: isBackground ? "🎨 Fundos de perfil" : "🖍️ Outline das bolhas",
                description: lines.slice(2).join("\n")
            }
        });
    }
    if (message.platform === "telegram") {
        return message.reply({
            text: lines.map(escapeHtml).join("\n"),
            parse_mode: "HTML"
        });
    }
    return message.reply({ text: lines.join("\n") });
}

function cosmeticType(value) {
    const normalized = normalizeCommand(value);
    if (["fundo", "fundos", "background", "backgrounds"].includes(normalized)) return "background";
    if (["linha", "linhas", "outline", "contorno", "contornos"].includes(normalized)) return "outline";
    return null;
}

function normalizeCommand(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
