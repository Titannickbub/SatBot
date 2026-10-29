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
    description: `🎨 Loja de cosméticos do perfil, organizada por categorias.

{prefix}cosmeticos
{prefix}cosmeticos fundo
{prefix}cosmeticos fundo <cor>
{prefix}cosmeticos previa fundo <cor>

Compre fundos com {prefix}comprar <id> ou {prefix}comprar fundo <cor>. Depois, aplique com {prefix}cosmeticos fundo <cor>. Os fundos têm IDs a partir de 2000.
Cada cor custa ${economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE)}. Fundos comprados podem ser equipados novamente sem custo.
Use "{prefix}cosmeticos fundo padrao" para restaurar o visual original.`,
    usage: "{prefix}cosmeticos [fundo [cor|padrao] | previa fundo <cor>]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ Os cosméticos só funcionam em grupos ou servidores." });
        }

        const [action, category, colorArgument] = message.args || [];
        const state = economy.getProfileCosmetics(message);
        const current = state.background
            ? economy.PROFILE_BACKGROUNDS[state.background].label
            : "Original";
        const prefix = message.prefix || "!";
        const normalizedAction = normalizeCommand(action);

        if (normalizedAction === "previa" || normalizedAction === "preview") {
            if (!isBackgroundCategory(category) || !colorArgument) {
                return message.reply({
                    text: `❌ Uso: ${prefix}cosmeticos previa fundo <cor>\nExemplo: ${prefix}cosmeticos previa fundo oceano`
                });
            }
            const backgroundKey = normalizeCommand(colorArgument);
            const background = economy.PROFILE_BACKGROUNDS[backgroundKey];
            if (!background) {
                return message.reply({
                    text: `❌ Cor inválida. Use ${prefix}cosmeticos fundo para consultar os fundos disponíveis.`
                });
            }
            return sendPreview(message, { ...background, key: backgroundKey }, prefix, false);
        }

        if (!normalizedAction) {
            return replyMenu(message, current, prefix);
        }

        if (!isBackgroundCategory(normalizedAction)) {
            return message.reply({
                text: `❌ Use ${prefix}cosmeticos para abrir a loja ou ${prefix}cosmeticos fundo para consultar os fundos.`
            });
        }

        if (!category) {
            return replyBackgroundCatalog(message, state, current, prefix);
        }

        const normalizedBackground = normalizeCommand(category);
        if (["padrao", "original", "default", "resetar"].includes(normalizedBackground)) {
            const result = economy.resetProfileBackground(message);
            return message.reply({
                text: result.changed
                    ? "✅ Fundo original restaurado. Suas cores compradas continuam disponíveis."
                    : "ℹ️ Seu perfil já está usando o fundo original."
            });
        }

        const background = economy.PROFILE_BACKGROUNDS[normalizedBackground];
        if (!background) {
            return message.reply({
                text: `❌ Fundo inválido. Use ${prefix}cosmeticos fundo para consultar os fundos disponíveis.`
            });
        }
        const ownedBackgrounds = economy.getProfileCosmetics(message).ownedBackgrounds;
        if (!ownedBackgrounds.includes(normalizedBackground)) {
            return message.reply({
                text: `🎨 Você ainda não possui o fundo ${background.label}.\nPara comprar, use ${prefix}comprar ${background.id} ou ${prefix}comprar fundo ${normalizedBackground}.\nPara ver a prévia, use ${prefix}cosmeticos previa fundo ${normalizedBackground}.`
            });
        }

        const result = economy.setProfileBackground(message, normalizedBackground);
        if (!result.purchased) {
            return message.reply({
                text: "❌ Não foi possível aplicar esse fundo. Tente novamente."
            });
        }
        return message.reply({
            text: `✅ Fundo ${background.label} aplicado.`
        });
    }
};

async function sendPreview(message, background, prefix, includePurchaseInfo) {
    try {
        const result = await imageBanner.renderProfileBackgroundPreview(background.key);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        const purchaseInfo = includePurchaseInfo
            ? `\n\n💳 Para comprar: ${prefix}comprar ${background.id} ou ${prefix}comprar fundo ${background.key}.\nPreço: ${economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE)}.${backgroundIsOwned(message, background.key) ? " Você já possui este fundo; comprá-lo novamente apenas o equipa, sem cobrança." : ""}`
            : "";
        return message.replyImg({
            image: result.buffer,
            caption: `${result.caption}${purchaseInfo}`,
            fileName: `previa-fundo-${background.key}.png`
        });
    } catch (error) {
        console.error("[COSMETICOS] Não foi possível gerar a prévia do fundo:", error.message || error);
        return message.reply({ text: "❌ Não foi possível gerar a prévia agora. Tente novamente." });
    }
}

function backgroundIsOwned(message, backgroundKey) {
    return economy.getProfileCosmetics(message).ownedBackgrounds.includes(backgroundKey);
}

function replyMenu(message, current, prefix) {
    const categoryLine = `🎨 Fundos de perfil — ${prefix}cosmeticos fundo`;
    const currentLine = `Fundo atual: ${current}`;
    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: 0x8fb5ff,
                title: "🎨 Loja de cosméticos",
                description: `Personalize seu perfil neste grupo ou servidor.\n\n**Categorias**\n${categoryLine}\n\n${currentLine}`,
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
                `<code>${escapeHtml(categoryLine)}</code>`,
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
            categoryLine,
            "",
            currentLine
        ].join("\n")
    });
}

function replyBackgroundCatalog(message, state, current, prefix) {
    const groups = new Map();
    for (const [key, background] of Object.entries(economy.PROFILE_BACKGROUNDS)) {
        if (!groups.has(background.rarity)) groups.set(background.rarity, []);
        const selected = state.background === key;
        const owned = state.ownedBackgrounds.includes(key);
        const status = selected ? "em uso" : owned ? "comprado" : economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE);
        groups.get(background.rarity).push(
            `${selected ? "✅" : owned ? "☑️" : "🎨"} ID ${background.id}. ${background.label} (${key}) — ${status}`
        );
    }

    const lines = [
        "🎨 FUNDOS DE PERFIL",
        "━━━━━━━━━━━━━━━━━━━━━━",
        `Fundo atual: ${current}`,
        ...[...groups].flatMap(([rarity, items]) => [
            "",
            `Categoria: ${RARITY_LABELS[rarity] || rarity}`,
            ...items
        ]),
        "",
        "Para ver a prévia e as instruções de compra:",
        `${prefix}cosmeticos fundo <cor> — aplica um fundo comprado`,
        `${prefix}cosmeticos previa fundo <cor>`,
        "",
        `Compre com ${prefix}comprar <id> ou ${prefix}comprar fundo <cor>.`,
        `Cada fundo custa ${economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE)}. Fundos comprados podem ser equipados novamente sem custo.`
    ];

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: 0x8fb5ff,
                title: "🎨 Fundos de perfil",
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

function isBackgroundCategory(value) {
    return ["fundo", "fundos", "background", "backgrounds"].includes(normalizeCommand(value));
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
