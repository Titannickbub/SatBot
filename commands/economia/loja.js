const economy = require("../../functions/economy");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const ITEM_EMOJIS = {
    work: "💼",
    fishing: "🎣",
    mining: "⛏️",
    casino: "🎰",
    transfer: "💸",
    robbery: "🥷",
    all: "🔄",
    shield: "🛡️"
};

const RARITY_LABELS = {
    [economy.ITEM_RARITY.COMMON]: "Comum",
    [economy.ITEM_RARITY.UNCOMMON]: "Incomum",
    [economy.ITEM_RARITY.RARE]: "Raro",
    [economy.ITEM_RARITY.EPIC]: "Épico",
    [economy.ITEM_RARITY.LEGENDARY]: "Lendário"
};

module.exports = {
    name: "loja",
    aliases: ["shop", "store"],
    category: "economia/loja",
    description: `🛒 Exibe o catálogo de itens e resets disponíveis para compra com satcoins na economia local.

📝 1. Consulte os itens disponíveis e seus preços:
{prefix}loja

O bot lista todos os resets (trabalho, pesca, mineração, roubo, cassino) e itens de proteção como o Escudo Anti-Roubo.

🛍️ Para comprar qualquer item listado, utilize o comando {prefix}comprar <número|nome>.`,
    usage: "{prefix}loja",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A loja só funciona em grupos ou servidores." });
        }

        const items = economy.getStoreItems();
        const itemLines = items.map(item =>
            `${ITEM_EMOJIS[item.key] || "🔹"} ${item.position}. ${item.name} — ${economy.formatMoney(item.price)} · ${RARITY_LABELS[item.rarity] || "Item"}`
        );
        const prefix = message.prefix || "!";
        const purchaseInstructions = [
            "⏳ Resets só podem ser comprados quando o limite correspondente acabar.",
            "🔄 O reset todos exige que trabalho, pesca, mineração e roubo estejam no limite.",
            "🛡️ O escudo exige saldo mínimo de 500,00💷 e só pode ser comprado sem outro escudo ativo.",
            `🎨 Cosméticos de perfil: consulte fundos, outlines, círculos e efeitos com ${prefix}cosmeticos.`
        ];

        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: 0xF1C40F,
                    title: "🛒 Loja de Economia",
                    description: [
                        "Use satcoins para comprar resets e itens nesta comunidade.",
                        "",
                        ...itemLines.map(line => `**${line}**`)
                    ].join("\n"),
                    fields: [
                        {
                            name: "🧾 Como comprar",
                            value: [
                                "Selecione um item abaixo para abrir uma confirmação privada.",
                                `Também é possível usar \`${prefix}comprar <número|nome>\`.`,
                                `Ex.: \`${prefix}comprar 1\` ou \`${prefix}comprar resetar trabalho\``
                            ].join("\n")
                        },
                        {
                            name: "📌 Regras",
                            value: purchaseInstructions.join("\n")
                        }
                    ],
                    footer: { text: "Preços e saldo são locais deste servidor" }
                },
                components: createDiscordStoreComponents(items)
            });
        }

        const lines = [
            message.platform === "telegram" ? "<b>🛒 LOJA DE ECONOMIA</b>" : "*🛒 LOJA DE ECONOMIA*",
            "━━━━━━━━━━━━━━━━━━━━━━",
            "",
            message.platform === "telegram" ? "✨ <b>Itens disponíveis</b>" : "*✨ Itens disponíveis*",
            ...itemLines.map(line => message.platform === "telegram" ? escapeHtml(line) : `*${escapeMarkdown(line)}*`),
            "",
            message.platform === "telegram" ? "🧾 <b>COMO COMPRAR</b>" : "*🧾 COMO COMPRAR*",
            message.platform === "telegram"
                ? `Toque em um item abaixo para confirmar a compra no grupo.\n<code>${escapeHtml(prefix)}comprar &lt;número|nome&gt;</code>`
                : `\`${escapeMarkdown(prefix)}comprar <número|nome>\``,
            message.platform === "telegram"
                ? `🔢 Número: <code>${escapeHtml(prefix)}comprar 1</code>`
                : `🔢 Número: \`${escapeMarkdown(prefix)}comprar 1\``,
            message.platform === "telegram"
                ? `🏷️ Nome: <code>${escapeHtml(prefix)}comprar resetar trabalho</code>`
                : `🏷️ Nome: \`${escapeMarkdown(prefix)}comprar resetar trabalho\``,
            "",
            message.platform === "telegram" ? "📌 <b>REGRAS</b>" : "*📌 REGRAS*",
            ...purchaseInstructions
        ];

        return message.reply({
            text: lines.join("\n"),
            ...(message.platform === "telegram"
                ? {
                    parse_mode: "HTML",
                    reply_markup: createTelegramStoreKeyboard(items)
                }
                : {})
        });
    },

    async handleInteraction(interaction) {
        const commandId = interaction.customId || interaction.callbackQuery?.data || "";
        const [commandName, action, itemKey] = String(commandId).split(":");
        if (commandName !== "loja") return false;

        const isDiscordSelection = interaction.isStringSelectMenu?.() &&
            interaction.customId === "loja:select";
        const isTelegramSelection = Boolean(interaction.callbackQuery) &&
            action === "choose";
        if (!isDiscordSelection && !isTelegramSelection) return false;

        const selectedItemKey = isDiscordSelection
            ? interaction.values[0]
            : itemKey;
        const buyCommand = require("./comprar");
        await buyCommand.beginPurchase(interaction, selectedItemKey);
        return true;
    }
};

function createDiscordStoreComponents(items) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("loja:select")
        .setPlaceholder("Selecione um item para comprar")
        .addOptions(items.map(item => ({
            label: item.name,
            description: `Preço: ${economy.formatMoney(item.price)}`,
            value: item.key
        })));

    return [new ActionRowBuilder().addComponents(menu)];
}

function createTelegramStoreKeyboard(items) {
    return {
        inline_keyboard: items.map(item => [{
            text: `${ITEM_EMOJIS[item.key] || "🔹"} ${item.name} — ${economy.formatMoney(item.price)}`,
            callback_data: `loja:choose:${item.key}`
        }])
    };
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeMarkdown(value) {
    return String(value).replace(/([*_~`\\])/g, "\\$1");
}
