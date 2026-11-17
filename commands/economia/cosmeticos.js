const economy = require("../../functions/economy");
const imageBanner = require("../../functions/imageBanner");
const profileCosmetics = require("../../functions/profileCosmetics");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

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
    description: "Consulte, compre e equipe fundos, outlines, círculos e efeitos cosméticos no seu perfil.",
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
    },

    async handleInteraction(interaction) {
        const componentId = interaction.customId || interaction.callbackQuery?.data || "";
        const parts = String(componentId).split(":");
        const [commandName, action, typeOrIndex, key] = parts;
        if (commandName !== "cosmeticos") return false;

        const isDiscord = !interaction.callbackQuery &&
            (interaction.isStringSelectMenu?.() || interaction.isButton?.());
        const isTelegram = Boolean(interaction.callbackQuery);

        if (action === "back" && (isDiscord || isTelegram)) {
            const message = createInteractionMessage(
                interaction,
                { sendNewMessage: isTelegram && typeOrIndex === "items" }
            );
            if (typeOrIndex === "items") {
                const ownerId = key;
                const type = parts[4];
                if (String(message.userId) !== ownerId) {
                    if (isTelegram) {
                        await interaction.answerCbQuery("Esta navegação pertence a outra pessoa.", { show_alert: true });
                    } else {
                        await interaction.reply({ content: "❌ Esta navegação pertence a outra pessoa.", ephemeral: true });
                    }
                    return true;
                }
                if (!cosmeticType(type)) {
                    return isTelegram
                        ? interaction.answerCbQuery("Categoria inválida.", { show_alert: true })
                        : interaction.reply({ content: "❌ Categoria inválida.", ephemeral: true });
                }
                const state = economy.getProfileCosmetics(message);
                const labels = currentCosmeticLabels(state);
                if (isTelegram) {
                    await interaction.answerCbQuery();
                    await replyCosmeticCatalog(
                        message, state, type, labels.background, labels.outline,
                        labels.circle, labels.effect, message.prefix
                    );
                    try {
                        await interaction.deleteMessage();
                    } catch (error) {
                        console.warn("[COSMETICOS] Não foi possível remover a prévia anterior:", error.message || error);
                        await interaction.editMessageCaption("Catálogo atualizado abaixo.", {
                            reply_markup: { inline_keyboard: [] }
                        });
                    }
                    return true;
                }
                const payload = replyCosmeticCatalog(
                    message, state, type, labels.background, labels.outline,
                    labels.circle, labels.effect, message.prefix
                );
                await interaction.update({ ...toDiscordInteractionPayload(payload), attachments: [] });
                return true;
            }

            if (typeOrIndex !== "menu") return false;
            if (isTelegram) await interaction.answerCbQuery();
            const state = economy.getProfileCosmetics(message);
            const labels = currentCosmeticLabels(state);
            const payload = replyMenu(
                message, labels.background, labels.outline, labels.circle,
                labels.effect, message.prefix
            );
            if (isDiscord) await interaction.update(toDiscordInteractionPayload(payload));
            else await payload;
            return true;
        }

        if (isDiscord && action === "category") {
            const type = interaction.values?.[0];
            if (!cosmeticType(type)) return false;
            const message = createInteractionMessage(interaction);
            const state = economy.getProfileCosmetics(message);
            const labels = currentCosmeticLabels(state);
            await interaction.update(toDiscordInteractionPayload(replyCosmeticCatalog(
                message, state, type, labels.background, labels.outline,
                labels.circle, labels.effect, message.prefix
            )));
            return true;
        }

        if (isTelegram && action === "category") {
            const type = typeOrIndex;
            if (!cosmeticType(type)) {
                await interaction.answerCbQuery("Categoria inválida.", { show_alert: true });
                return true;
            }
            await interaction.answerCbQuery();
            const message = createInteractionMessage(interaction);
            const state = economy.getProfileCosmetics(message);
            const labels = currentCosmeticLabels(state);
            await replyCosmeticCatalog(
                message, state, type, labels.background, labels.outline,
                labels.circle, labels.effect, message.prefix
            );
            return true;
        }

        let selectedType;
        let selectedKey;
        if (isDiscord && action === "select") {
            [selectedType, selectedKey] = String(interaction.values?.[0] || "").split(":");
        } else if (isTelegram && action === "choose") {
            selectedType = typeOrIndex;
            selectedKey = key;
        } else {
            return false;
        }

        if (!cosmeticType(selectedType) || !itemsForType(selectedType)[selectedKey]) {
            return isTelegram
                ? interaction.answerCbQuery("Esse cosmético não está mais disponível.", { show_alert: true })
                : interaction.reply({ content: "❌ Esse cosmético não está mais disponível.", ephemeral: true });
        }

        const buyCommand = require("./comprar");
        await buyCommand.beginCosmeticPurchase(interaction, selectedType, selectedKey);
        return true;
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
            },
            components: createDiscordCategoryMenu()
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
            parse_mode: "HTML",
            reply_markup: createTelegramCategoryKeyboard()
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
        "No Discord e no Telegram, selecione a categoria e o cosmético para confirmar a compra ou aplicar um item que já possui.",
        "Os comandos de texto continuam disponíveis em todas as plataformas.",
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
        "Selecione um item abaixo para confirmar a compra ou aplicar um item que já possui.",
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
            },
            components: createDiscordCosmeticComponents(type, itemsByKey, ownedItems)
        });
    }
    if (message.platform === "telegram") {
        return message.reply({
            text: lines.map(escapeHtml).join("\n"),
            parse_mode: "HTML",
            reply_markup: createTelegramCosmeticKeyboard(type, itemsByKey, ownedItems)
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

function currentCosmeticLabels(state) {
    return {
        background: state.background
            ? economy.PROFILE_BACKGROUNDS[state.background].label
            : "Original",
        outline: state.outline
            ? economy.PROFILE_OUTLINES[state.outline].label
            : "Padrão (acompanha o fundo)",
        circle: state.circle ? economy.PROFILE_CIRCLES[state.circle].label : "Nenhum",
        effect: state.effect ? economy.PROFILE_EFFECTS[state.effect].label : "Nenhum"
    };
}

function createDiscordCategoryMenu() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("cosmeticos:category")
        .setPlaceholder("Escolha uma categoria");
    for (const type of ["background", "outline", "circle", "effect"]) {
        menu.addOptions({
            label: typeLabel(type),
            description: `Consultar ${categoryName(type)}s disponíveis`,
            value: type,
            emoji: typeEmoji(type)
        });
    }
    return [new ActionRowBuilder().addComponents(menu)];
}

function createTelegramCategoryKeyboard() {
    return {
        inline_keyboard: ["background", "outline", "circle", "effect"].map(type => [{
            text: `${typeEmoji(type)} ${typeLabel(type)}`,
            callback_data: `cosmeticos:category:${type}`
        }])
    };
}

function createDiscordCosmeticComponents(type, itemsByKey, ownedItems) {
    const entries = Object.entries(itemsByKey);
    const rows = [];
    for (let offset = 0; offset < Math.min(entries.length, 100); offset += 25) {
        const index = Math.floor(offset / 25);
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`cosmeticos:select:${index}`)
            .setPlaceholder(`Selecione ${typeLabel(type).toLowerCase()} para comprar ou aplicar`)
            .addOptions(entries.slice(offset, offset + 25).map(([key, item]) => ({
                label: `ID ${item.id} · ${item.label}`,
                description: ownedItems.includes(key)
                    ? "Já possui — aplicar sem custo"
                    : `Preço: ${economy.formatMoney(priceForType(type, key))}`,
                value: `${type}:${key}`,
                emoji: ownedItems.includes(key) ? "✅" : typeEmoji(type)
            })));
        rows.push(new ActionRowBuilder().addComponents(menu));
    }
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("cosmeticos:back:menu")
            .setLabel("Voltar às categorias")
            .setStyle(ButtonStyle.Secondary)
    ));
    return rows;
}

function createTelegramCosmeticKeyboard(type, itemsByKey, ownedItems) {
    const keyboard = Object.entries(itemsByKey).slice(0, 100).map(([key, item]) => [{
        text: ownedItems.includes(key)
            ? `✅ ${item.label} · aplicar`
            : `${typeEmoji(type)} ${item.label} · ${economy.formatMoney(priceForType(type, key))}`,
        callback_data: `cosmeticos:choose:${type}:${key}`
    }]);
    keyboard.push([{
        text: "⬅️ Voltar às categorias",
        callback_data: "cosmeticos:back:menu"
    }]);
    return {
        inline_keyboard: keyboard
    };
}

function createInteractionMessage(interaction, { sendNewMessage = false } = {}) {
    const prefix = require("../../functions/config").getConfig().prefix || "!";
    if (interaction.callbackQuery) {
        const sourceMessage = interaction.callbackQuery.message;
        const chat = sourceMessage.chat;
        return {
            platform: "telegram",
            chatId: String(chat.id),
            chatName: chat.title || null,
            threadId: sourceMessage.message_thread_id ? String(sourceMessage.message_thread_id) : null,
            chatType: chat.type,
            isPrivate: chat.type === "private",
            userId: String(interaction.from.id),
            username: interaction.from.username || null,
            displayName: [interaction.from.first_name, interaction.from.last_name]
                .filter(Boolean).join(" ") || interaction.from.username || String(interaction.from.id),
            prefix,
            raw: { chat },
            reply: payload => {
                const options = {
                    ...(payload.parse_mode ? { parse_mode: payload.parse_mode } : {}),
                    ...(payload.reply_markup ? { reply_markup: payload.reply_markup } : {})
                };
                if (sendNewMessage) {
                    if (sourceMessage.message_thread_id) {
                        options.message_thread_id = Number(sourceMessage.message_thread_id);
                    }
                    return interaction.reply(payload.text, options);
                }
                return interaction.editMessageText(payload.text, options);
            }
        };
    }

    return {
        platform: "discord",
        chatId: String(interaction.channelId),
        guildId: interaction.guildId ? String(interaction.guildId) : null,
        chatType: interaction.guildId ? "group" : "private",
        isPrivate: !interaction.guildId,
        userId: String(interaction.user.id),
        username: interaction.user.username,
        displayName: interaction.member?.displayName || interaction.user.globalName || interaction.user.username,
        prefix,
        raw: { guild: interaction.guild, guildId: interaction.guildId },
        reply: payload => payload
    };
}

function toDiscordInteractionPayload(payload) {
    const { embed, ...rest } = payload;
    return {
        ...rest,
        ...(embed ? { embeds: [embed] } : {})
    };
}
