const economy = require("../../functions/economy");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const DISCORD_SELECT_OPTIONS_PER_MENU = 25;
const DISCORD_MAX_SELECT_MENUS = 5;
const TELEGRAM_MAX_BUTTONS = 100;

module.exports = {
    name: "loja2",
    aliases: ["mercado"],
    category: "economia/loja",
    description: `🛍️ Exibe a loja configurada pelos administradores deste grupo/servidor.

📝 Consulte os itens, os preços e a quantidade disponível:
{prefix}loja2

Compre pelo ID ou nome usando {prefix}comprar <id|nome> (ou {prefix}comprar2 <id|nome>).
No Discord e no Telegram, selecione um item e confirme o pedido; os comandos de texto continuam disponíveis.`,
    usage: "{prefix}loja2",

    async execute(message) {
        const store = economy.getCommunityStore(message);
        if (!store) {
            return message.reply({ text: "❌ A loja só funciona em grupos ou servidores." });
        }

        const prefix = message.prefix || "!";
        const groupedItems = groupItemsByCategory(store.items);
        const lines = [
            `*${escapeMarkdown(store.title)}*`,
            "━━━━━━━━━━━━━━━━━━━━━━",
            "",
            "*ℹ️ AVISO DOS ADMS:*",
            `_${escapeMarkdown(store.notice)}_`,
            "",
            "*✨ ITENS DISPONÍVEIS*"
        ];
        if (store.items.length === 0) {
            lines.push("_A loja ainda não tem itens cadastrados._");
        } else {
            for (const [category, items] of groupedItems) {
                lines.push("", `_${escapeMarkdown(category)}_`);
                for (const item of items) {
                    const quantity = item.quantity === null ? "∞" : `📦 ${item.quantity}`;
                    lines.push(`🏷️ ID ${item.id}. *${escapeMarkdown(item.name)}* — ${economy.formatMoney(item.price)} | ${quantity}`);
                }
            }
        }

        lines.push(
            "",
            "━━━━━━━━━━━━━━━━━━━━━━",
            "*🧾 COMO COMPRAR*",
            `\`${escapeMarkdown(prefix)}comprar <id|nome>\` ou \`${escapeMarkdown(prefix)}comprar2 <id|nome>\``,
            `🔢 Exemplo: \`${escapeMarkdown(prefix)}comprar 1001\``,
            `🏷️ Exemplo: \`${escapeMarkdown(prefix)}comprar Fanart\``,
            "",
            "*📌 REGRAS DA LOJA LOCAL*",
            "📦 O valor é descontado automaticamente do seu saldo.",
            "⏳ A compra gera um pedido para a equipe realizar a entrega manual.",
            "❌ Se o pedido for cancelado, o valor é devolvido."
        );
        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: 0xF1C40F,
                    title: store.title,
                    description: [
                        "ℹ️ **AVISO DOS ADMS:**",
                        store.notice,
                        "",
                        "**✨ ITENS DISPONÍVEIS**",
                        ...groupedItems.flatMap(([category, items]) => [
                            `_${category}_`,
                            ...items.map(item =>
                                `🏷️ ID ${item.id}. **${item.name}** — ${economy.formatMoney(item.price)} | ${item.quantity === null ? "∞" : `📦 ${item.quantity}`}`
                            )
                        ]),
                        ...(store.items.length === 0 ? ["A loja ainda não tem itens cadastrados."] : []),
                        "",
                        `Compre com \`${prefix}comprar <id|nome>\`.`
                    ].join("\n"),
                    fields: [
                        {
                            name: "🧾 Como comprar",
                            value: [
                                "Selecione um item para abrir uma confirmação privada.",
                                `Também é possível usar \`${prefix}comprar <id|nome>\`.`,
                                ...(store.items.filter(isInStock).length > DISCORD_SELECT_OPTIONS_PER_MENU * DISCORD_MAX_SELECT_MENUS
                                    ? [`Para os demais itens, use \`${prefix}comprar <id|nome>\`.`]
                                    : [])
                            ].join("\n")
                        },
                        {
                            name: "📌 Regras",
                            value: "O valor é descontado do saldo; a entrega é manual. Pedidos cancelados são reembolsados."
                        }
                    ],
                    footer: { text: "Estoque e saldo locais deste servidor" }
                },
                components: createDiscordStoreComponents(store.items)
            });
        }
        if (message.platform === "telegram") {
            const htmlItems = groupedItems.flatMap(([category, items]) => [
                "",
                `<i>${escapeHtml(category)}</i>`,
                ...items.map(item =>
                    `🏷️ ID ${item.id}. <b>${escapeHtml(item.name)}</b> — ${escapeHtml(economy.formatMoney(item.price))} | ${item.quantity === null ? "∞" : `📦 ${item.quantity}`}`
                )
            ]);
            return message.reply({
                text: [
                    `<b>${escapeHtml(store.title)}</b>`,
                    "━━━━━━━━━━━━━━━━━━━━━━",
                    "",
                    "<b>ℹ️ AVISO DOS ADMS:</b>",
                    escapeHtml(store.notice),
                    "",
                    "<b>✨ ITENS DISPONÍVEIS</b>",
                    ...(store.items.length === 0 ? ["A loja ainda não tem itens cadastrados."] : htmlItems),
                    "",
                    "━━━━━━━━━━━━━━━━━━━━━━",
                    "<b>🧾 COMO COMPRAR</b>",
                    "Toque em um item abaixo para confirmar a compra no grupo.",
                    `<code>${escapeHtml(prefix)}comprar &lt;id|nome&gt;</code> ou <code>${escapeHtml(prefix)}comprar2 &lt;id|nome&gt;</code>`,
                    `🔢 Exemplo: <code>${escapeHtml(prefix)}comprar 1001</code>`,
                    `🏷️ Exemplo: <code>${escapeHtml(prefix)}comprar Fanart</code>`,
                    "",
                    "<b>📌 REGRAS DA LOJA LOCAL</b>",
                    "📦 O valor é descontado automaticamente do seu saldo.",
                    "⏳ A compra gera um pedido para entrega manual.",
                    "❌ Se o pedido for cancelado, o valor é devolvido.",
                    ...(store.items.filter(isInStock).length > TELEGRAM_MAX_BUTTONS
                        ? [`A lista interativa mostra até ${TELEGRAM_MAX_BUTTONS} itens; use o comando por ID ou nome para os demais.`]
                        : [])
                ].join("\n"),
                parse_mode: "HTML",
                ...(store.items.some(isInStock)
                    ? { reply_markup: createTelegramStoreKeyboard(store.items) }
                    : {})
            });
        }

        return message.reply({ text: lines.join("\n") });
    },

    async handleInteraction(interaction) {
        const componentId = interaction.customId || interaction.callbackQuery?.data || "";
        const [commandName, action, itemId] = String(componentId).split(":");
        if (commandName !== "loja2") return false;

        const isDiscordSelection = interaction.isStringSelectMenu?.() &&
            interaction.customId === "loja2:select";
        const isTelegramSelection = Boolean(interaction.callbackQuery) &&
            action === "choose";
        if (!isDiscordSelection && !isTelegramSelection) return false;

        const selectedItemId = isDiscordSelection
            ? interaction.values[0]
            : itemId;
        const buyCommand = require("./comprar");
        await buyCommand.beginCommunityPurchase(interaction, selectedItemId);
        return true;
    }
};

function isInStock(item) {
    return item.quantity === null || item.quantity > 0;
}

function createDiscordStoreComponents(items) {
    const selectableItems = items.filter(isInStock)
        .slice(0, DISCORD_SELECT_OPTIONS_PER_MENU * DISCORD_MAX_SELECT_MENUS);
    const rows = [];

    for (let index = 0; index < selectableItems.length; index += DISCORD_SELECT_OPTIONS_PER_MENU) {
        const page = selectableItems.slice(index, index + DISCORD_SELECT_OPTIONS_PER_MENU);
        const menu = new StringSelectMenuBuilder()
            .setCustomId("loja2:select")
            .setPlaceholder(`Selecione um item (${Math.floor(index / DISCORD_SELECT_OPTIONS_PER_MENU) + 1})`)
            .addOptions(page.map(item => ({
                label: truncateText(item.name, 100),
                description: truncateText(
                    `ID ${item.id} • ${economy.formatMoney(item.price)} • Estoque: ${item.quantity === null ? "∞" : item.quantity}`,
                    100
                ),
                value: String(item.id)
            })));
        rows.push(new ActionRowBuilder().addComponents(menu));
    }

    return rows;
}

function createTelegramStoreKeyboard(items) {
    const availableItems = items.filter(isInStock).slice(0, TELEGRAM_MAX_BUTTONS);
    return {
        inline_keyboard: availableItems.map(item => [{
            text: truncateText(
                `${item.name} #${item.id} — ${economy.formatMoney(item.price)}`,
                64
            ),
            callback_data: `loja2:choose:${item.id}`
        }])
    };
}

function truncateText(value, maxLength) {
    return Array.from(String(value)).slice(0, maxLength).join("");
}

function groupItemsByCategory(items) {
    const categories = new Map();
    for (const item of items) {
        if (!categories.has(item.category)) categories.set(item.category, []);
        categories.get(item.category).push(item);
    }
    return [...categories];
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
