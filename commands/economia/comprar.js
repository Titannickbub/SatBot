const economy = require("../../functions/economy");
const imageBanner = require("../../functions/imageBanner");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    name: "comprar",
    aliases: ["buy", "comprar2"],
    category: "economia/loja",
    description: `🛍️ Compra itens da loja local, resets, itens de proteção ou cosméticos usando seus satcoins.

📝 1. Compre informando o número ou nome do item da loja:
{prefix}comprar 1
{prefix}comprar resetar trabalho
{prefix}comprar escudo
{prefix}comprar 2000
{prefix}comprar fundo azul
{prefix}comprar linha azul

Consulte a {prefix}loja para verificar a lista de produtos, números e preços atuais.
Para comprar um item da loja configurada pelos administradores, use {prefix}loja2 e informe o ID (a partir de 1001) ou nome. Os pedidos aguardam entrega manual e podem ser cancelados pela equipe.
Fundos cosméticos podem ser comprados pelo ID (a partir de 2000) ou com "fundo <cor>". Outlines das bolhas usam IDs a partir de 3000 ou "linha <cor>".
Círculos de perfil usam IDs a partir de 4000 ou "circulo <cor>"; efeitos usam IDs a partir de 5000 ou "efeito <nome>".

⚠️ Resets só podem ser comprados após esgotar o limite diário da atividade correspondente.`,
    usage: "{prefix}comprar [texto]",

    async beginPurchase(interaction, itemKey) {
        const item = getStoreItem(itemKey);
        const isTelegram = Boolean(interaction.callbackQuery);
        const message = isTelegram
            ? createTelegramPurchaseMessage(interaction)
            : createDiscordPurchaseMessage(interaction);

        if (!item) {
            return isTelegram
                ? interaction.answerCbQuery("Esse item não está mais disponível.", { show_alert: true })
                : interaction.reply({ content: "❌ Esse item não está mais disponível.", ephemeral: true });
        }
        if (!economy.getScope(message)) {
            return isTelegram
                ? interaction.answerCbQuery("A loja só funciona em grupos ou servidores.", { show_alert: true })
                : interaction.reply({ content: "❌ A loja só funciona em grupos ou servidores.", ephemeral: true });
        }
        if (!economy.isEnabled(message)) {
            return isTelegram
                ? interaction.answerCbQuery("A economia está desativada neste grupo.", { show_alert: true })
                : interaction.reply({ content: "❌ A economia está desativada neste servidor.", ephemeral: true });
        }

        const ownerId = String(message.userId);
        const confirmation = getPurchaseConfirmation(item, message);
        if (isTelegram) {
            await interaction.answerCbQuery("Confirmação enviada.");
            return interaction.reply(confirmation, {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: "✅ Confirmar compra",
                            callback_data: `comprar:telegram:confirm:${ownerId}:${item.key}`
                        },
                        {
                            text: "Cancelar",
                            callback_data: `comprar:telegram:cancel:${ownerId}:${item.key}`
                        }
                    ]]
                },
                ...(message.threadId ? { message_thread_id: Number(message.threadId) } : {})
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`comprar:discord:confirm:${ownerId}:${item.key}`)
                .setLabel("Confirmar compra")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`comprar:discord:cancel:${ownerId}:${item.key}`)
                .setLabel("Cancelar")
                .setStyle(ButtonStyle.Secondary)
        );
        return interaction.reply({
            content: confirmation,
            components: [row],
            ephemeral: true
        });
    },

    async beginCommunityPurchase(interaction, itemId) {
        const isTelegram = Boolean(interaction.callbackQuery);
        const message = isTelegram
            ? createTelegramPurchaseMessage(interaction)
            : createDiscordPurchaseMessage(interaction);
        if (!economy.getScope(message)) {
            return isTelegram
                ? interaction.answerCbQuery("A loja só funciona em grupos ou servidores.", { show_alert: true })
                : interaction.reply({ content: "❌ A loja só funciona em grupos ou servidores.", ephemeral: true });
        }
        const store = economy.getCommunityStore(message);
        const item = store?.items.find(candidate => candidate.id === Number(itemId));

        if (!item) {
            return isTelegram
                ? interaction.answerCbQuery("Esse item não está mais disponível.", { show_alert: true })
                : interaction.reply({ content: "❌ Esse item não está mais disponível.", ephemeral: true });
        }
        if (item.quantity === 0) {
            return isTelegram
                ? interaction.answerCbQuery("Esse item está esgotado no momento.", { show_alert: true })
                : interaction.reply({ content: "❌ Esse item está esgotado no momento.", ephemeral: true });
        }
        if (!economy.isEnabled(message)) {
            return isTelegram
                ? interaction.answerCbQuery("A economia está desativada neste grupo.", { show_alert: true })
                : interaction.reply({ content: "❌ A economia está desativada neste servidor.", ephemeral: true });
        }

        const ownerId = String(message.userId);
        const priceCode = item.price.toString(36);
        const confirmation = [
            "🛍️ Confirmar pedido da loja local",
            `👤 Comprador: ${getPurchaseBuyer(message)}`,
            `📦 Item: ${item.name}`,
            `💰 Valor: ${economy.formatMoney(item.price)}`,
            item.quantity === null ? "Estoque: infinito" : `Estoque disponível: ${item.quantity}`,
            "",
            "O pedido será enviado para entrega manual após a confirmação."
        ].join("\n");

        if (isTelegram) {
            await interaction.answerCbQuery("Confirmação enviada.");
            return interaction.reply(confirmation, {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: "✅ Confirmar pedido",
                            callback_data: `comprar:tc:${ownerId}:${item.id}:${priceCode}`
                        },
                        {
                            text: "Cancelar",
                            callback_data: `comprar:tx:${ownerId}:${item.id}`
                        }
                    ]]
                },
                ...(message.threadId ? { message_thread_id: Number(message.threadId) } : {})
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`comprar:discord:community:confirm:${ownerId}:${item.id}:${priceCode}`)
                .setLabel("Confirmar pedido")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`comprar:discord:community:cancel:${ownerId}:${item.id}`)
                .setLabel("Cancelar")
                .setStyle(ButtonStyle.Secondary)
        );
        return interaction.reply({
            content: confirmation,
            components: [row],
            ephemeral: true
        });
    },

    async beginCosmeticPurchase(interaction, type, key) {
        const isTelegram = Boolean(interaction.callbackQuery);
        const message = isTelegram
            ? createTelegramPurchaseMessage(interaction)
            : createDiscordPurchaseMessage(interaction);
        const cosmetic = getCosmeticItem(type, key);
        if (!cosmetic) {
            return isTelegram
                ? interaction.answerCbQuery("Esse cosmético não está mais disponível.", { show_alert: true })
                : interaction.reply({ content: "❌ Esse cosmético não está mais disponível.", ephemeral: true });
        }
        if (!economy.getScope(message)) {
            return isTelegram
                ? interaction.answerCbQuery("A loja só funciona em grupos ou servidores.", { show_alert: true })
                : interaction.reply({ content: "❌ A loja só funciona em grupos ou servidores.", ephemeral: true });
        }
        if (!economy.isEnabled(message)) {
            return isTelegram
                ? interaction.answerCbQuery("A economia está desativada neste grupo.", { show_alert: true })
                : interaction.reply({ content: "❌ A economia está desativada neste servidor.", ephemeral: true });
        }

        const state = economy.getProfileCosmetics(message);
        const alreadyOwned = getOwnedCosmetics(state, type).includes(key);
        const ownerId = String(message.userId);
        const priceCode = cosmetic.price.toString(36);
        let preview;
        try {
            preview = await renderCosmeticPreview(type, key);
        } catch (error) {
            console.error("[COMPRAR] Não foi possível gerar a prévia do cosmético:", error.message || error);
            return isTelegram
                ? interaction.answerCbQuery("Não foi possível gerar a prévia agora. Tente novamente.", { show_alert: true })
                : interaction.reply({ content: "❌ Não foi possível gerar a prévia agora. Tente novamente.", ephemeral: true });
        }
        if (preview.error) {
            return isTelegram
                ? interaction.answerCbQuery(preview.error, { show_alert: true })
                : interaction.reply({ content: `❌ ${preview.error}`, ephemeral: true });
        }
        const confirmation = [
            "🎨 Confirmar cosmético",
            `👤 Comprador: ${getPurchaseBuyer(message)}`,
            `🧩 Item: ${cosmetic.item.label} (${typeLabel(type)})`,
            `💰 Valor: ${alreadyOwned ? "Sem custo — você já possui este item" : economy.formatMoney(cosmetic.price)}`,
            "",
            alreadyOwned
                ? "Ao confirmar, o cosmético será aplicado sem nova cobrança."
                : "O cosmético será comprado e aplicado após a confirmação.",
            "",
            preview.caption
        ].join("\n");
        const fileName = `cosmetico-${type}-${key}.png`;

        if (isTelegram) {
            await interaction.answerCbQuery("Confirmação enviada.");
            return interaction.replyWithPhoto({ source: preview.buffer }, {
                caption: confirmation,
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: alreadyOwned ? "✅ Aplicar cosmético" : "✅ Confirmar compra",
                            callback_data: `comprar:cc:${ownerId}:${cosmetic.typeCode}:${cosmetic.item.id}:${priceCode}`
                        },
                        {
                            text: "Cancelar",
                            callback_data: `comprar:cx:${ownerId}:${cosmetic.typeCode}:${cosmetic.item.id}`
                        },
                        {
                            text: "⬅️ Voltar",
                            callback_data: `cosmeticos:back:items:${ownerId}:${type}`
                        }
                    ]]
                },
                ...(message.threadId ? { message_thread_id: Number(message.threadId) } : {})
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`comprar:discord:cosmetic:confirm:${ownerId}:${cosmetic.typeCode}:${cosmetic.item.id}:${priceCode}`)
                .setLabel(alreadyOwned ? "Aplicar cosmético" : "Confirmar compra")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`comprar:discord:cosmetic:cancel:${ownerId}:${cosmetic.typeCode}:${cosmetic.item.id}`)
                .setLabel("Cancelar")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`cosmeticos:back:items:${ownerId}:${type}`)
                .setLabel("Voltar à categoria")
                .setStyle(ButtonStyle.Secondary)
        );
        return interaction.reply({
            content: confirmation,
            files: [{ attachment: preview.buffer, name: fileName }],
            components: [row],
            ephemeral: true
        });
    },

    async handleInteraction(interaction) {
        const commandId = interaction.customId || interaction.callbackQuery?.data || "";
        const parts = String(commandId).split(":");
        const [commandName, platform] = parts;
        if (commandName !== "comprar") return false;

        const isCompactTelegram = ["tc", "tx", "cc", "cx"].includes(platform);
        const isTelegram = (platform === "telegram" || isCompactTelegram) &&
            Boolean(interaction.callbackQuery);
        const isDiscord = platform === "discord" && interaction.isButton?.();
        if (!isTelegram && !isDiscord) return false;

        let isCommunityPurchase = false;
        let isCosmeticPurchase = false;
        let action;
        let ownerId;
        let itemId;
        let expectedPrice;
        let cosmeticType;
        if (isCompactTelegram) {
            isCommunityPurchase = platform === "tc" || platform === "tx";
            isCosmeticPurchase = platform === "cc" || platform === "cx";
            action = platform === "tc" || platform === "cc" ? "confirm" : "cancel";
            ownerId = parts[2];
            if (isCommunityPurchase) {
                itemId = parts[3];
                expectedPrice = platform === "tc" ? Number.parseInt(parts[4], 36) : null;
            } else {
                cosmeticType = getCosmeticType(parts[3]);
                itemId = parts[4];
                expectedPrice = platform === "cc" ? Number.parseInt(parts[5], 36) : null;
            }
        } else if (parts[2] === "community") {
            isCommunityPurchase = true;
            action = parts[3];
            ownerId = parts[4];
            itemId = parts[5];
            expectedPrice = parts[6] ? Number.parseInt(parts[6], 36) : null;
        } else if (parts[2] === "cosmetic") {
            isCosmeticPurchase = true;
            action = parts[3];
            ownerId = parts[4];
            cosmeticType = getCosmeticType(parts[5]);
            itemId = parts[6];
            expectedPrice = parts[7] ? Number.parseInt(parts[7], 36) : null;
        } else {
            action = parts[2];
            ownerId = parts[3];
            itemId = parts[4];
        }

        const message = isTelegram
            ? createTelegramPurchaseMessage(interaction)
            : createDiscordPurchaseMessage(interaction);
        if (String(message.userId) !== ownerId) {
            if (isTelegram) {
                await interaction.answerCbQuery("Esta confirmação pertence a outra pessoa.", { show_alert: true });
            } else {
                await interaction.reply({ content: "❌ Esta confirmação pertence a outra pessoa.", ephemeral: true });
            }
            return true;
        }

        if (isCommunityPurchase) {
            if (action === "cancel") {
                return isTelegram
                    ? editTelegramPurchase(interaction, "Pedido cancelado.")
                    : interaction.update({ content: "Pedido cancelado.", components: [] });
            }
            if (action !== "confirm") {
                return isTelegram
                    ? interaction.answerCbQuery("Ação inválida.", { show_alert: true })
                    : interaction.update({ content: "❌ Ação inválida.", components: [] });
            }

            const store = economy.getCommunityStore(message);
            const item = store?.items.find(candidate => candidate.id === Number(itemId));
            if (!item) {
                return isTelegram
                    ? editTelegramPurchase(interaction, "❌ Esse item não está mais disponível. Consulte a loja novamente.")
                    : interaction.update({ content: "❌ Esse item não está mais disponível. Consulte a loja novamente.", components: [] });
            }
            if (!Number.isSafeInteger(expectedPrice) || item.price !== expectedPrice) {
                const text = `⚠️ O preço de ${item.name} mudou para ${economy.formatMoney(item.price)}. Consulte a loja e confirme novamente.`;
                return isTelegram
                    ? editTelegramPurchase(interaction, text)
                    : interaction.update({ content: text, components: [] });
            }
            if (!economy.isEnabled(message)) {
                const text = "❌ A economia está desativada neste grupo/servidor.";
                return isTelegram
                    ? editTelegramPurchase(interaction, text)
                    : interaction.update({ content: text, components: [] });
            }

            const result = economy.buyCommunityStoreItem(message, String(item.id));
            const text = result.purchased
                ? getCommunityOrderText(message, result)
                : getCommunityErrorMessage(result, message);
            return isTelegram
                ? editTelegramPurchase(interaction, text)
                : interaction.update({ content: text, components: [] });
        }

        if (isCosmeticPurchase) {
            if (action === "cancel") {
                return updateCosmeticPurchase(
                    interaction, "Compra de cosmético cancelada.", isTelegram,
                    cosmeticType, String(message.userId)
                );
            }
            if (action !== "confirm") {
                return isTelegram
                    ? interaction.answerCbQuery("Ação inválida.", { show_alert: true })
                    : interaction.update({ content: "❌ Ação inválida.", components: [] });
            }

            const cosmetic = getCosmeticItemById(cosmeticType, itemId);
            if (!cosmetic) {
                const text = "❌ Esse cosmético não está mais disponível. Consulte a loja novamente.";
                return updateCosmeticPurchase(interaction, text, isTelegram, cosmeticType, String(message.userId));
            }
            const alreadyOwned = getOwnedCosmetics(
                economy.getProfileCosmetics(message),
                cosmeticType
            ).includes(cosmetic.key);
            if (!alreadyOwned &&
                (!Number.isSafeInteger(expectedPrice) || cosmetic.price !== expectedPrice)) {
                const text = `⚠️ O preço de ${cosmetic.item.label} mudou para ${economy.formatMoney(cosmetic.price)}. Consulte a loja e confirme novamente.`;
                return updateCosmeticPurchase(interaction, text, isTelegram, cosmeticType, String(message.userId));
            }
            if (!economy.isEnabled(message)) {
                const text = "❌ A economia está desativada neste grupo/servidor.";
                return updateCosmeticPurchase(interaction, text, isTelegram, cosmeticType, String(message.userId));
            }

            const selection = `${cosmetic.category} ${cosmetic.key}`;
            const result = economy.buyProfileCosmetic(message, selection);
            const text = getCosmeticPurchaseResultText(result, message);
            return updateCosmeticPurchase(interaction, text, isTelegram, cosmeticType, String(message.userId));
        }

        if (action === "cancel") {
            if (isTelegram) {
                return editTelegramPurchase(interaction, "Compra cancelada.");
            } else {
                return interaction.update({ content: "Compra cancelada.", components: [] });
            }
        }
        if (action !== "confirm") {
            if (isTelegram) {
                await interaction.answerCbQuery("Ação inválida.", { show_alert: true });
            } else {
                await interaction.reply({ content: "❌ Ação inválida.", ephemeral: true });
            }
            return true;
        }

        const item = getStoreItem(itemId);
        if (!item) {
            return isTelegram
                ? editTelegramPurchase(interaction, "❌ Esse item não está mais disponível.")
                : interaction.update({ content: "❌ Esse item não está mais disponível.", components: [] });
        }
        if (!economy.isEnabled(message)) {
            const text = "❌ A economia está desativada neste grupo/servidor.";
            return isTelegram
                ? editTelegramPurchase(interaction, text)
                : interaction.update({ content: text, components: [] });
        }

        const result = economy.buyStoreItem(message, item.key);
        const text = getStorePurchaseResultText(result, message);
        if (isTelegram) {
            return editTelegramPurchase(interaction, text);
        }
        return interaction.update({ content: text, components: [] });
    },

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A loja só funciona em grupos ou servidores." });
        }

        const selection = message.args?.join(" ");
        if (message.command !== "comprar2") {
            const cosmeticResult = economy.buyProfileCosmetic(message, selection);
            if (cosmeticResult.matched) {
                if (!cosmeticResult.purchased) {
                    if (cosmeticResult.reason === "insufficient-balance") {
                        return message.reply({
                            text: `❌ Saldo insuficiente. Você precisa de ${economy.formatMoney(cosmeticResult.price)} e tem ${economy.formatMoney(cosmeticResult.balance)}.`
                        });
                    }
                    return message.reply({
                        text: `❌ Cosmético não encontrado. Use ${message.prefix}cosmeticos para consultar as categorias, IDs e nomes disponíveis.`
                    });
                }

                const cosmeticName = cosmeticResult.item.label;
                const cosmeticType = {
                    outline: "Outline",
                    circle: "Círculo de perfil",
                    effect: "Efeito de perfil",
                    background: "Fundo"
                }[cosmeticResult.type];
                const text = cosmeticResult.boughtNow
                    ? `✅ ${cosmeticType} ${cosmeticName} comprado e aplicado por ${economy.formatMoney(cosmeticResult.price)}.\nSaldo atual: ${economy.formatMoney(cosmeticResult.balance)}`
                    : `✅ ${cosmeticType} ${cosmeticName} aplicado. Você já tinha comprado esse cosmético, então não houve cobrança.`;
                return message.reply({ text });
            }
        }

        const communityResult = economy.buyCommunityStoreItem(message, selection);
        if (communityResult.purchased) {
            return replyForCommunityOrder(message, communityResult);
        }
        if (message.command === "comprar2") {
            return message.reply({ text: getCommunityErrorMessage(communityResult, message) });
        }

        const result = economy.buyStoreItem(message, selection);
        const text = getStorePurchaseResultText(result, message);
        if (!result.purchased) {
            return message.reply({ text });
        }

        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: 0x2ECC71,
                    title: "🛒 Compra concluída",
                    description: text,
                    footer: { text: "Economia local deste servidor" }
                }
            });
        }

        if (message.platform === "telegram") {
            return message.reply({ text: `<b>🛒 COMPRA CONCLUÍDA</b>\n━━━━━━━━━━━━━━━━━━━━━━\n${escapeHtml(text)}`, parse_mode: "HTML" });
        }

        return message.reply({ text });
    }
};

function getStoreItem(itemKey) {
    return economy.getStoreItems().find(item => item.key === itemKey) || null;
}

function renderCosmeticPreview(type, key) {
    const renderers = {
        background: imageBanner.renderProfileBackgroundPreview,
        outline: imageBanner.renderProfileOutlinePreview,
        circle: imageBanner.renderProfileCirclePreview,
        effect: imageBanner.renderProfileEffectPreview
    };
    return renderers[type](key);
}

function getCosmeticItem(type, key) {
    if (!getCosmeticTypeCode(type)) return null;
    const item = economy[`PROFILE_${type.toUpperCase()}S`]?.[key];
    if (!item) return null;
    return {
        type,
        typeCode: getCosmeticTypeCode(type),
        key,
        item,
        category: getCosmeticCategory(type),
        price: getCosmeticPrice(type, key)
    };
}

function getCosmeticItemById(type, itemId) {
    if (!type || !/^\d+$/.test(String(itemId))) return null;
    const items = economy[`PROFILE_${type.toUpperCase()}S`];
    const entry = Object.entries(items || {}).find(([, item]) => item.id === Number(itemId));
    return entry ? getCosmeticItem(type, entry[0]) : null;
}

function getCosmeticType(typeCode) {
    return ({
        b: "background",
        o: "outline",
        c: "circle",
        e: "effect"
    })[typeCode] || null;
}

function getCosmeticTypeCode(type) {
    return ({
        background: "b",
        outline: "o",
        circle: "c",
        effect: "e"
    })[type] || null;
}

function getCosmeticCategory(type) {
    return ({
        background: "fundo",
        outline: "linha",
        circle: "circulo",
        effect: "efeito"
    })[type] || null;
}

function getCosmeticPrice(type, key) {
    return ({
        background: economy.getProfileBackgroundPrice,
        outline: economy.getProfileOutlinePrice,
        circle: economy.getProfileCirclePrice,
        effect: economy.getProfileEffectPrice
    })[type](key);
}

function getOwnedCosmetics(state, type) {
    return ({
        background: state.ownedBackgrounds,
        outline: state.ownedOutlines,
        circle: state.ownedCircles,
        effect: state.ownedEffects
    })[type] || [];
}

function typeLabel(type) {
    return ({
        background: "Fundo",
        outline: "Outline",
        circle: "Círculo de perfil",
        effect: "Efeito de perfil"
    })[type];
}

function getCosmeticPurchaseResultText(result, message) {
    if (!result.purchased) {
        if (result.reason === "insufficient-balance") {
            return `❌ Saldo insuficiente. Você precisa de ${economy.formatMoney(result.price)} e tem ${economy.formatMoney(result.balance)}.`;
        }
        return `❌ Cosmético não encontrado. Use ${message.prefix}cosmeticos para consultar as categorias, IDs e nomes disponíveis.`;
    }

    const cosmeticType = typeLabel(result.type);
    return result.boughtNow
        ? `✅ ${cosmeticType} ${result.item.label} comprado e aplicado por ${economy.formatMoney(result.price)}.\nSaldo atual: ${economy.formatMoney(result.balance)}`
        : `✅ ${cosmeticType} ${result.item.label} aplicado. Você já tinha comprado esse cosmético, então não houve cobrança.`;
}

function getStorePurchaseResultText(result, message) {
    if (!result.purchased) {
        return getStorePurchaseErrorMessage(result.reason, message, result.item);
    }

    return [
        `✅ ${result.item.name} comprado com sucesso!`,
        result.item.key === "shield"
            ? `🛡️ Escudo ativo com ${result.shieldCharges} cargas de proteção.`
            : "O reset já está ativo.",
        `Valor pago: ${economy.formatMoney(result.item.price)}`,
        `Saldo atual: ${economy.formatMoney(result.balance)}`
    ].join("\n");
}

function getStorePurchaseErrorMessage(reason, message, item) {
    if (reason === "invalid_item") {
        return `❌ Item inválido. Use ${message.prefix}loja para ver a lista e escolha uma posição ou nome.`;
    }
    if (reason === "not_ready") {
        return "⏳ Esse limite ainda não acabou. Você só pode comprar o reset quando esgotar todas as tentativas do item.";
    }
    if (reason === "shield_active") {
        return "🛡️ Você já possui um escudo ativo. Só poderá comprar outro quando as cinco cargas acabarem.";
    }
    if (reason === "shield_min_balance") {
        return `❌ Você precisa ter pelo menos ${economy.formatMoney(economy.MIN_SHIELD_BALANCE)} para comprar um escudo.`;
    }
    if (reason === "all_not_ready") {
        return "⏳ O reset todos só fica disponível quando trabalho, pesca e mineração chegarem ao limite.";
    }
    if (reason === "insufficient_balance") {
        return `❌ Saldo insuficiente. Você precisa de ${economy.formatMoney(item.price)} para comprar esse reset.`;
    }
    return "❌ Não foi possível concluir a compra.";
}

function getPurchaseConfirmation(item, message) {
    return [
        "🛒 Confirmar compra",
        `👤 Comprador: ${getPurchaseBuyer(message)}`,
        `📦 Item: ${item.name}`,
        `💰 Valor: ${economy.formatMoney(item.price)}`,
        "",
        "A compra só será concluída após confirmar."
    ].join("\n");
}

function getPurchaseBuyer(message) {
    return message.username && message.username !== message.displayName
        ? `${message.displayName || message.username} (@${message.username})`
        : message.displayName || message.username || message.userId;
}

function createDiscordPurchaseMessage(interaction) {
    return {
        platform: "discord",
        chatId: String(interaction.channelId),
        guildId: interaction.guildId ? String(interaction.guildId) : null,
        chatType: interaction.guildId ? "group" : "private",
        isPrivate: !interaction.guildId,
        userId: String(interaction.user.id),
        username: interaction.user.username,
        displayName: interaction.member?.displayName || interaction.user.globalName || interaction.user.username,
        prefix: require("../../functions/config").getConfig().prefix || "!",
        raw: {
            guild: interaction.guild,
            guildId: interaction.guildId
        }
    };
}

function createTelegramPurchaseMessage(ctx) {
    const sourceMessage = ctx.callbackQuery.message;
    const chat = sourceMessage.chat;
    return {
        platform: "telegram",
        chatId: String(chat.id),
        chatName: chat.title || null,
        threadId: sourceMessage.message_thread_id ? String(sourceMessage.message_thread_id) : null,
        chatType: chat.type,
        isPrivate: chat.type === "private",
        userId: String(ctx.from.id),
        username: ctx.from.username || null,
        displayName: [
            ctx.from.first_name,
            ctx.from.last_name
        ].filter(Boolean).join(" ") || ctx.from.username || String(ctx.from.id),
        prefix: require("../../functions/config").getConfig().prefix || "!",
        raw: { chat }
    };
}

async function editTelegramPurchase(ctx, text) {
    await ctx.answerCbQuery();
    return ctx.editMessageText(text, { reply_markup: { inline_keyboard: [] } });
}

async function updateCosmeticPurchase(interaction, text, isTelegram, type, ownerId) {
    const backId = `cosmeticos:back:items:${ownerId}:${type}`;
    if (isTelegram) {
        await interaction.answerCbQuery();
        return interaction.editMessageCaption(text, {
            reply_markup: {
                inline_keyboard: [[{ text: "⬅️ Voltar à categoria", callback_data: backId }]]
            }
        });
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(backId)
            .setLabel("Voltar à categoria")
            .setStyle(ButtonStyle.Secondary)
    );
    return interaction.update({ content: text, components: [row], attachments: [] });
}

function replyForCommunityOrder(message, result) {
    const text = getCommunityOrderText(message, result);

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: 0x2ECC71,
                title: "🧾 Pedido da loja local",
                description: text,
                footer: { text: `Item #${result.item.id} • pedido aguardando entrega` }
            }
        });
    }
    if (message.platform === "telegram") {
        return message.reply({
            text: `<b>🧾 PEDIDO #${result.order.id} CRIADO</b>\n${escapeHtml(result.item.name)}\nValor pago: ${escapeHtml(economy.formatMoney(result.item.price))}\nSaldo atual: ${escapeHtml(economy.formatMoney(result.balance))}\n\n⏳ A equipe fará a entrega manualmente.\nAdministradores: use ${escapeHtml(message.prefix)}configloja2 pedidos para consultar.`,
            parse_mode: "HTML"
        });
    }
    return message.reply({ text });
}

function getCommunityOrderText(message, result) {
    return [
        `✅ Pedido #${result.order.id} criado para ${result.item.name}!`,
        `Valor pago: ${economy.formatMoney(result.item.price)}`,
        `Saldo atual: ${economy.formatMoney(result.balance)}`,
        "",
        "⏳ A equipe deste grupo/servidor fará a entrega manualmente.",
        `Administradores: use ${message.prefix}configloja2 pedidos para consultar os pedidos.`
    ].join("\n");
}

function getCommunityErrorMessage(result, message) {
    if (result.reason === "out_of_stock") return "❌ Esse item está esgotado no momento.";
    if (result.reason === "insufficient_balance") {
        return `❌ Saldo insuficiente. Você precisa de ${economy.formatMoney(result.item.price)} para comprar esse item.`;
    }
    return `❌ Item da loja 2 não encontrado. Use ${message.prefix}loja2 para consultar os itens e seus IDs (a partir de 1001).`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
