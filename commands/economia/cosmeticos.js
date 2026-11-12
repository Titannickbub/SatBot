const economy = require("../../functions/economy");
const imageBanner = require("../../functions/imageBanner");
const profileCosmetics = require("../../functions/profileCosmetics");

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
    description: "Consulte e equipe fundos, outlines, círculos e efeitos cosméticos no seu perfil.",
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
        const currentCircle = state.circle ? economy.PROFILE_CIRCLES[state.circle].label : "Nenhum";
        const currentEffect = state.effect ? economy.PROFILE_EFFECTS[state.effect].label : "Nenhum";

        if (normalizedAction === "previa" || normalizedAction === "preview") {
            const type = cosmeticType(category);
            if (!type || !colorArgument) {
                return message.reply({
                    text: `❌ Uso: ${prefix}cosmeticos previa fundo|linha <cor>`
                });
            }
            const resolvers = {
                background: profileCosmetics.resolveProfileBackground,
                outline: profileCosmetics.resolveProfileOutline,
                circle: profileCosmetics.resolveProfileCircle,
                effect: profileCosmetics.resolveProfileEffect
            };
            const item = resolvers[type](colorArgument);
            if (!item) {
                return message.reply({
                    text: `❌ Opção inválida. Use ${prefix}cosmeticos ${categoryName(type)} para consultar as opções.`
                });
            }
            return sendPreview(message, item, prefix, type, false);
        }

        if (!normalizedAction) {
            return replyMenu(message, currentBackground, currentOutline, currentCircle, currentEffect, prefix);
        }

        const type = cosmeticType(normalizedAction);
        if (!type) {
            return message.reply({
                text: `❌ Use ${prefix}cosmeticos para abrir a loja, ${prefix}cosmeticos fundo, linha, circulo ou efeito para consultar as categorias.`
            });
        }

        if (!category) {
            return replyCosmeticCatalog(message, state, type, currentBackground, currentOutline, currentCircle, currentEffect, prefix);
        }

        const key = normalizeCommand(category);
        if (["padrao", "original", "default", "resetar"].includes(key)) {
            const resetters = {
                background: economy.resetProfileBackground,
                outline: economy.resetProfileOutline,
                circle: economy.resetProfileCircle,
                effect: economy.resetProfileEffect
            };
            const result = resetters[type](message);
            return message.reply({
                text: result.changed
                    ? type === "outline"
                        ? "✅ Outline padrão restaurado; ele acompanha a cor do fundo. Seus outlines comprados continuam disponíveis."
                        : `✅ ${typeLabel(type)} removido. Os cosméticos comprados continuam disponíveis.`
                    : type === "outline"
                        ? "ℹ️ O outline já acompanha a cor do fundo."
                        : `ℹ️ Você já está sem ${typeLabel(type).toLowerCase()}.`
            });
        }

        const items = itemsForType(type);
        const item = items[key];
        if (!item) {
            return message.reply({
                text: `❌ Opção inválida. Use ${prefix}cosmeticos ${categoryName(type)} para consultar as opções.`
            });
        }
        const freshState = economy.getProfileCosmetics(message);
        const owned = ownedForType(freshState, type);
        if (!owned.includes(key)) {
            return message.reply({
                text: `🎨 Você ainda não possui ${typeLabel(type).toLowerCase()} ${item.label}.\nPara comprar, use ${prefix}comprar ${item.id} ou ${prefix}comprar ${categoryName(type)} ${key}.\nPara ver a prévia, use ${prefix}cosmeticos previa ${categoryName(type)} ${key}.`
            });
        }

        const setters = {
            background: economy.setProfileBackground,
            outline: economy.setProfileOutline,
            circle: economy.setProfileCircle,
            effect: economy.setProfileEffect
        };
        const result = setters[type](message, key);
        if (!result.purchased) {
            return message.reply({
                text: "❌ Não foi possível aplicar esse cosmético. Tente novamente."
            });
        }
        return message.reply({
            text: `✅ ${typeLabel(type)} ${item.label} aplicado.`
        });
    }
};

async function sendPreview(message, item, prefix, type, includePurchaseInfo) {
    try {
        const renderers = {
            background: imageBanner.renderProfileBackgroundPreview,
            outline: imageBanner.renderProfileOutlinePreview,
            circle: imageBanner.renderProfileCirclePreview,
            effect: imageBanner.renderProfileEffectPreview
        };
        const result = await renderers[type](item.key);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        const purchaseInfo = includePurchaseInfo
            ? `\n\n💳 Para comprar: ${prefix}comprar ${item.id} ou ${prefix}comprar ${categoryName(type)} ${item.key}.\nPreço: ${economy.formatMoney(priceForType(type, item.key))}.${cosmeticIsOwned(message, item.key, type) ? " Você já possui este cosmético; comprá-lo novamente apenas o equipa, sem cobrança." : ""}`
            : "";
        return message.replyImg({
            image: result.buffer,
            caption: `${result.caption}${purchaseInfo}`,
            fileName: `previa-${categoryName(type)}-${item.key}.png`
        });
    } catch (error) {
        console.error("[COSMETICOS] Não foi possível gerar a prévia do cosmético:", error.message || error);
        return message.reply({ text: "❌ Não foi possível gerar a prévia agora. Tente novamente." });
    }
}

function cosmeticIsOwned(message, key, type) {
    const state = economy.getProfileCosmetics(message);
    return ownedForType(state, type).includes(key);
}

function replyMenu(message, currentBackground, currentOutline, currentCircle, currentEffect, prefix) {
    const categoryLines = [
        `🎨 Fundos de perfil — ${prefix}cosmeticos fundo`,
        `🖍️ Outlines de perfil — ${prefix}cosmeticos linha`,
        `⭕ Círculos de perfil — ${prefix}cosmeticos circulo`,
        `❄️ Efeitos de perfil — ${prefix}cosmeticos efeito`
    ];
    const currentLine = `Fundo: ${currentBackground}\nOutline: ${currentOutline}\nCírculo de perfil: ${currentCircle}\nEfeito de perfil: ${currentEffect}`;
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
        "Consulte fundos, outlines, círculos e efeitos de perfil.",
        "",
        "Abra a loja e veja as opções:",
        `${prefix}cosmeticos`,
        `${prefix}cosmeticos fundo`,
        `${prefix}cosmeticos linha`,
        `${prefix}cosmeticos circulo`,
        `${prefix}cosmeticos efeito`,
        "",
        "Veja a prévia de um cosmético:",
        `${prefix}cosmeticos previa fundo <id|cor>`,
        `${prefix}cosmeticos previa linha <id|cor>`,
        `${prefix}cosmeticos previa circulo <id|cor>`,
        `${prefix}cosmeticos previa efeito <id|nome>`,
        "",
        "Equipe um cosmético que já possui:",
        `${prefix}cosmeticos fundo <cor>`,
        `${prefix}cosmeticos linha <cor>`,
        `${prefix}cosmeticos circulo <cor>`,
        `${prefix}cosmeticos efeito congelado`,
        "Use 'padrao' para remover o cosmético equipado, sem perder os itens comprados.",
        "",
        "Para comprar, use o ID na loja ou:",
        `${prefix}comprar fundo <cor>`,
        `${prefix}comprar linha <cor>`,
        `${prefix}comprar circulo <cor>`,
        `${prefix}comprar efeito congelado`,
        `Cosméticos comprados podem ser equipados novamente sem custo.`
    ].join("\n");
}

function replyCosmeticCatalog(message, state, type, currentBackground, currentOutline, currentCircle, currentEffect, prefix) {
    const itemsByKey = itemsForType(type);
    const ownedItems = ownedForType(state, type);
    const activeItem = state[ type === "background" ? "background" : type === "outline" ? "outline" : type === "circle" ? "circle" : "effect" ];
    const groups = new Map();
    for (const [key, item] of Object.entries(itemsByKey)) {
        if (!groups.has(item.rarity)) groups.set(item.rarity, []);
        const selected = activeItem === key;
        const owned = ownedItems.includes(key);
        const price = priceForType(type, key);
        const status = selected ? "em uso" : owned ? "comprado" : economy.formatMoney(price);
        groups.get(item.rarity).push(
            `${selected ? "✅" : owned ? "☑️" : "🎨"} ID ${item.id}. ${item.label} (${key}) — ${status}`
        );
    }

    const lines = [
        `${typeEmoji(type)} ${typeLabel(type).toUpperCase()}`,
        "━━━━━━━━━━━━━━━━━━━━━━",
        `Em uso: ${{
            background: currentBackground,
            outline: currentOutline,
            circle: currentCircle,
            effect: currentEffect
        }[type]}`,
        ...[...groups].flatMap(([rarity, items]) => [
            "",
            `Categoria: ${RARITY_LABELS[rarity] || rarity}`,
            ...items
        ]),
        "",
        "Para ver a prévia e aplicar uma opção comprada:",
        `${prefix}cosmeticos ${categoryName(type)} <item>`,
        `${prefix}cosmeticos previa ${categoryName(type)} <id|item>`,
        "",
        `Compre com ${prefix}comprar <id> ou ${prefix}comprar ${categoryName(type)} <item>.`,
        `Itens épicos custam ${economy.formatMoney(economy.PROFILE_EFFECT_PRICE)}. Opções compradas podem ser equipadas novamente sem custo.`,
        `${prefix}cosmeticos ${categoryName(type)} padrao — remover o item equipado.`
    ];

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: 0x8fb5ff,
                title: `${typeEmoji(type)} ${typeLabel(type)}`,
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
    if (["circulo", "circulos", "anel", "aneis", "circle", "circles"].includes(normalized)) return "circle";
    if (["efeito", "efeitos", "effect", "effects"].includes(normalized)) return "effect";
    return null;
}

function itemsForType(type) {
    return {
        background: economy.PROFILE_BACKGROUNDS,
        outline: economy.PROFILE_OUTLINES,
        circle: economy.PROFILE_CIRCLES,
        effect: economy.PROFILE_EFFECTS
    }[type];
}

function ownedForType(state, type) {
    return {
        background: state.ownedBackgrounds,
        outline: state.ownedOutlines,
        circle: state.ownedCircles,
        effect: state.ownedEffects
    }[type];
}

function priceForType(type, key) {
    return {
        background: economy.getProfileBackgroundPrice,
        outline: economy.getProfileOutlinePrice,
        circle: economy.getProfileCirclePrice,
        effect: economy.getProfileEffectPrice
    }[type](key);
}

function categoryName(type) {
    return { background: "fundo", outline: "linha", circle: "circulo", effect: "efeito" }[type];
}

function typeLabel(type) {
    return { background: "Fundo", outline: "Outline", circle: "Círculo de perfil", effect: "Efeito de perfil" }[type];
}

function typeEmoji(type) {
    return { background: "🎨", outline: "🖍️", circle: "⭕", effect: "❄️" }[type];
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
