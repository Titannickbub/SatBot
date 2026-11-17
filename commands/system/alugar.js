const rental = require("../../functions/rentalHelper");
const { isOwner } = require("../../functions/owners");
const send = require("../../functions/send");
const centralAccounts = require("../../functions/centralAccounts");
const mercadoPago = require("../../functions/mercadoPago");
const crypto = require("crypto");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const RENTAL_PAGE_SIZE = 4;
const SUBSCRIPTION_EXTENSIONS = [7, 30, 90];

function isSuperUser(message) {
    return Boolean(message.sender?.isOwner || isOwner(message));
}

function canRequestOrder(message) {
    return isSuperUser(message) || message.sender?.isAdmin === true;
}

function getOrderPermissionError(message) {
    return message.sender?.permissionCheckFailed
        ? "❌ Não consegui verificar suas permissões no Telegram. Dê ao bot acesso de administrador no grupo e tente novamente."
        : "❌ Somente administradores do grupo/servidor podem solicitar um aluguel.";
}

function parsePrice(value) {
    const normalized = String(value || "")
        .replace(/R\$\s*/gi, "")
        .replace(/\s/g, "")
        .replace(/\.(?=\d{3}(?:\D|$))/g, "")
        .replace(",", ".");
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) {
        throw new Error("Informe um valor válido, por exemplo 19,90.");
    }
    return Math.round(amount * 100);
}

function platformOf(message) {
    return rental.assertPlatform(message.platform);
}

function formatSubscription(subscription) {
    const end = subscription.permanent
        ? "permanente"
        : subscription.expiresAt
            ? new Date(subscription.expiresAt).toLocaleString("pt-BR")
            : "sem vencimento";
    return `${subscription.id} · ${subscription.scopeId} · ${subscription.planName || "Assinatura manual"} · ${end} · ${subscription.status}`;
}

async function reply(message, text) {
    return message.reply({ text });
}

function commandLine(command) {
    return `📌 ${command}`;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function escapeDiscordMarkdown(text) {
    return String(text).replace(/([\\_*~|`])/g, "\\$1");
}

function makeButton(label, customId, style = ButtonStyle.Secondary) {
    return { label: String(label).slice(0, 80), customId, style };
}

function makeComponentRows(platform, buttonRows) {
    if (platform === "discord") {
        return buttonRows.map(buttons => new ActionRowBuilder().addComponents(
            ...buttons.map(button => new ButtonBuilder()
                .setCustomId(button.customId)
                .setLabel(button.label)
                .setStyle(button.style))
        )
        );
    }
    if (platform === "telegram") {
        return buttonRows.map(buttons => buttons.map(button => ({
            text: button.label,
            callback_data: button.customId
        })));
    }
    return [];
}

function rentalPageButtons(page, totalPages, customIdPrefix) {
    if (totalPages <= 1) return [];
    const buttons = [];
    if (page > 0) {
        buttons.push(makeButton("⬅️ Anterior", `${customIdPrefix}:${page - 1}`));
    }
    if (page + 1 < totalPages) {
        buttons.push(makeButton("Próxima ➡️", `${customIdPrefix}:${page + 1}`));
    }
    return buttons.length ? [buttons] : [];
}

function createPlanChoiceRows(platform, plans, type, page = 0) {
    if (!["discord", "telegram"].includes(platform)) return [];
    const pages = Math.max(1, Math.ceil(plans.length / RENTAL_PAGE_SIZE));
    const currentPage = Math.min(Math.max(0, page), pages - 1);
    const visiblePlans = plans.slice(
        currentPage * RENTAL_PAGE_SIZE,
        (currentPage + 1) * RENTAL_PAGE_SIZE
    );
    const rows = visiblePlans.map(plan => [
        makeButton(
            `${rental.displayId(plan.id, "PL")} · ${plan.name} · ${rental.formatPrice(plan.priceCents)}`,
            `alugar:select:${plan.id}:${type}`,
            ButtonStyle.Primary
        )
    ]);
    rows.push(...rentalPageButtons(currentPage, pages, `alugar:catalog:${type}`));
    return makeComponentRows(platform, rows);
}

function replyPlanCatalog(message, plans, { title, footer, emptyText, type = "initial", page = 0 }) {
    const pages = Math.max(1, Math.ceil(plans.length / RENTAL_PAGE_SIZE));
    const currentPage = Math.min(Math.max(0, page), pages - 1);
    const displayedPlans = ["discord", "telegram"].includes(message.platform)
        ? plans.slice(currentPage * RENTAL_PAGE_SIZE, (currentPage + 1) * RENTAL_PAGE_SIZE)
        : plans;
    const items = displayedPlans.map(plan => ({
        title: `${rental.displayId(plan.id, "PL")} · ${plan.name}`,
        details: [
            `💰 ${rental.formatPrice(plan.priceCents)} · ⏱ ${rental.formatDuration(plan.durationMs)}`,
            ...(plan.active === false ? ["🔴 Inativo"] : [])
        ].join("\n")
    }));

    if (!items.length) items.push({ title: emptyText, details: "" });
    const components = message.isPrivate
        ? []
        : createPlanChoiceRows(message.platform, plans, type, currentPage);
    const pageFooter = pages > 1 && ["discord", "telegram"].includes(message.platform)
        ? `Página ${currentPage + 1}/${pages}${footer ? ` · ${footer}` : ""}`
        : footer;

    if (message.platform === "discord") {
        const description = items.map(item =>
            `**${escapeDiscordMarkdown(item.title)}**${item.details ? `\n${escapeDiscordMarkdown(item.details)}` : ""}`
        ).join("\n\n");
        return message.reply({
            embed: {
                color: 0xF1C40F,
                title: `💎 ${title}`,
                description,
                ...(pageFooter ? { footer: { text: pageFooter } } : {})
            },
            components
        });
    }

    if (message.platform === "telegram") {
        const body = items.map(item =>
            `<b>${escapeHtml(item.title)}</b>${item.details ? `\n${escapeHtml(item.details)}` : ""}`
        ).join("\n\n");
        const safeFooter = pageFooter
            ? `\n\n${pageFooter.split("\n").map(line => {
                const safeLine = escapeHtml(line);
                const command = safeLine.match(/^📌 (.+)$/);
                return command ? `📌 <code>${command[1]}</code>` : safeLine;
            }).join("\n")}`
            : "";
        return message.reply({
            text: `<b>💎 ${escapeHtml(title)}</b>\n\n${body}${safeFooter}`,
            parse_mode: "HTML",
            ...(components.length ? { reply_markup: { inline_keyboard: components } } : {})
        });
    }

    const body = items.map(item =>
        `*${item.title}*${item.details ? `\n${item.details}` : ""}`
    ).join("\n\n");
    return message.reply({ text: `*💎 ${title}*\n\n${body}${footer ? `\n\n${footer}` : ""}` });
}

function makeInteractionMessage(interaction) {
    const componentMessage = interaction?.[Symbol.for("satbot.componentMessageContext")];
    if (componentMessage?.platform && componentMessage.userId) return componentMessage;

    const isTelegram = Boolean(interaction?.callbackQuery);
    if (isTelegram) {
        const source = interaction.callbackQuery.message;
        const chat = source?.chat;
        if (!chat?.id || !interaction.from?.id) return null;
        return {
            platform: "telegram",
            chatId: String(chat.id),
            chatType: chat.type || "group",
            isPrivate: chat.type === "private",
            threadId: source.message_thread_id ? String(source.message_thread_id) : null,
            userId: String(interaction.from.id),
            username: interaction.from.username || null,
            displayName: [interaction.from.first_name, interaction.from.last_name]
                .filter(Boolean).join(" ") || interaction.from.username || String(interaction.from.id),
            prefix: require("../../functions/config").getPrefix(),
            raw: { chat },
            sender: { isOwner: false }
        };
    }

    const user = interaction?.user;
    const channel = interaction.channel;
    const channelId = interaction.channelId || channel?.id;
    if (!user?.id || !channelId) return null;
    const guild = interaction.guild || channel?.guild || null;
    const guildId = interaction.guildId || guild?.id || null;
    const message = {
        platform: "discord",
        chatId: String(channelId),
        guildId: guildId ? String(guildId) : null,
        chatType: guildId ? "group" : "private",
        isPrivate: !guildId,
        threadId: channel?.isThread?.() ? String(channelId) : null,
        categoryId: channel?.isThread?.()
            ? channel.parent?.parentId || channel.parent?.parent?.id || null
            : channel?.parentId || null,
        userId: String(user.id),
        username: user.username || null,
        displayName: interaction.member?.displayName || user.globalName || user.username || String(user.id),
        prefix: require("../../functions/config").getPrefix(),
        raw: { guild: guild || (guildId ? { id: String(guildId) } : null), channel },
        sender: { isOwner: false }
    };
    message.sender.isOwner = isOwner(message);
    return message;
}

function getInteractionUserName(message) {
    return message.displayName || message.username || message.userId;
}

function getPlanSnapshot(plan) {
    return crypto.createHash("sha256")
        .update(`${plan.id}:${plan.priceCents}:${plan.durationMs}`)
        .digest("hex")
        .slice(0, 8);
}

function buildAdminOrderPage(platform, page, notice = "") {
    const orders = rental.listOrders(platform).filter(order =>
        ["pending", "awaiting_payment"].includes(order.status)
    );
    const pages = Math.max(1, Math.ceil(orders.length / RENTAL_PAGE_SIZE));
    const currentPage = Math.min(Math.max(0, page), pages - 1);
    const visibleOrders = orders.slice(
        currentPage * RENTAL_PAGE_SIZE,
        (currentPage + 1) * RENTAL_PAGE_SIZE
    );
    const rows = visibleOrders.flatMap(order => order.status === "awaiting_payment"
        ? [[
            makeButton(`✅ Pagamento ${rental.displayId(order.id, "AL")}`, `alugarsu:approve:${order.id}`, ButtonStyle.Success),
            makeButton(`❌ ${rental.displayId(order.id, "AL")}`, `alugarsu:reject:${order.id}`, ButtonStyle.Danger),
            ...(order.paymentDeliveryWarning
                ? [makeButton(`↻ Pix ${rental.displayId(order.id, "AL")}`, `alugarsu:pixhelp:${order.id}`, ButtonStyle.Primary)]
                : [])
        ]]
        : [[
            makeButton(`💠 Enviar Pix ${rental.displayId(order.id, "AL")}`, `alugarsu:pixhelp:${order.id}`, ButtonStyle.Primary),
            makeButton(`↔️ Plano ${rental.displayId(order.id, "AL")}`, `alugarsu:editplan:${order.id}:${currentPage}`),
            makeButton(`❌ ${rental.displayId(order.id, "AL")}`, `alugarsu:reject:${order.id}`, ButtonStyle.Danger)
        ]]);
    rows.push(...rentalPageButtons(currentPage, pages, "alugarsu:orders"));
    const body = visibleOrders.length
        ? visibleOrders.map(order =>
            `${rental.displayId(order.id, "AL")} · ${order.type === "renewal" ? "Renovação" : "Contratação"} · ${order.planName} · ${order.status === "awaiting_payment" ? order.paymentReportedAt ? "solicitante informou o pagamento" : "aguardando pagamento" : "aguardando Pix"}\n` +
            `👤 ${order.creatorName || order.creatorId} · 🏠 ${order.scopeId}\n` +
            `💰 ${rental.formatPrice(order.priceCents)} · ⏱ ${rental.formatDuration(order.durationMs)}` +
            (order.paymentExpiresAt ? ` · prazo ${new Date(order.paymentExpiresAt).toLocaleString("pt-BR")}` : "") +
            (order.paymentDeliveryWarning ? `\n⚠️ ${order.paymentDeliveryWarning}` : "")
        ).join("\n\n")
        : "Não há pedidos pendentes.";
    const text = [
        `📥 Pedidos em aberto (${orders.length})`,
        body,
        ...(pages > 1 ? [`Página ${currentPage + 1}/${pages}`] : []),
        ...(notice ? [notice] : [])
    ].join("\n\n");
    return { text, components: makeComponentRows(platform, rows), page: currentPage };
}

function buildSubscriptionPage(platform, page, notice = "") {
    const subscriptions = rental.listSubscriptions(platform);
    const pages = Math.max(1, Math.ceil(subscriptions.length / RENTAL_PAGE_SIZE));
    const currentPage = Math.min(Math.max(0, page), pages - 1);
    const visibleSubscriptions = subscriptions.slice(
        currentPage * RENTAL_PAGE_SIZE,
        (currentPage + 1) * RENTAL_PAGE_SIZE
    );
    const rows = visibleSubscriptions.map(subscription => [
        ...(subscription.permanent ? [] : SUBSCRIPTION_EXTENSIONS.map(days =>
            makeButton(`+${days}d · ${rental.displayId(subscription.id, "AS")}`,
                `alugarsu:extend:${subscription.id}:${days}`)
        )),
        makeButton(`∞ · ${rental.displayId(subscription.id, "AS")}`,
            `alugarsu:permanent:${subscription.id}`),
        makeButton(`✖ · ${rental.displayId(subscription.id, "AS")}`,
            `alugarsu:remove:${subscription.id}`, ButtonStyle.Danger)
    ]);
    rows.push(...rentalPageButtons(currentPage, pages, "alugarsu:subscriptions"));
    const body = visibleSubscriptions.length
        ? visibleSubscriptions.map(subscription => {
            const end = subscription.permanent
                ? "Permanente"
                : subscription.expiresAt
                    ? new Date(subscription.expiresAt).toLocaleString("pt-BR")
                    : "Sem vencimento";
            return `${rental.displayId(subscription.id, "AS")} · ${subscription.planName || "Assinatura manual"} · ${subscription.status}\n` +
                `🏠 ${subscription.scopeId} · 🌐 ${subscription.platform} · ${end}`;
        }).join("\n\n")
        : "Nenhuma assinatura registrada.";
    const text = [
        `♧ Assinaturas (${subscriptions.length})`,
        body,
        "Os botões +7d/+30d/+90d estendem o prazo atual; ∞ torna permanente.",
        ...(pages > 1 ? [`Página ${currentPage + 1}/${pages}`] : []),
        ...(notice ? [notice] : [])
    ].join("\n\n");
    return { text, components: makeComponentRows(platform, rows), page: currentPage };
}

function buildOrderPlanPage(platform, orderId, page, notice = "") {
    const plans = rental.getPlans(platform).filter(plan => plan.active !== false);
    const pageSize = 3;
    const pages = Math.max(1, Math.ceil(plans.length / pageSize));
    const currentPage = Math.min(Math.max(0, page), pages - 1);
    const visiblePlans = plans.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    const rows = visiblePlans.map(plan => [
        makeButton(
            `${rental.displayId(plan.id, "PL")} · ${plan.name} · ${rental.formatPrice(plan.priceCents)}`,
            `alugarsu:setplan:${orderId}:${plan.id}`,
            ButtonStyle.Primary
        )
    ]);
    rows.push(...rentalPageButtons(currentPage, pages, `alugarsu:editplan:${orderId}`));
    rows.push([makeButton("⬅️ Voltar aos pedidos", "alugarsu:orders:0")]);
    const text = [
        `↔️ Escolha um plano para o pedido ${rental.displayId(orderId, "AL")}.`,
        ...(pages > 1 ? [`Página ${currentPage + 1}/${pages}`] : []),
        ...(notice ? [notice] : [])
    ].join("\n\n");
    return { text, components: makeComponentRows(platform, rows), page: currentPage };
}

function replyWithControls(message, text, components) {
    if (message.platform === "discord") {
        return message.reply({ text, components, allowedMentions: { parse: [] } });
    }
    if (message.platform === "telegram") {
        return message.reply({
            text,
            ...(components.length ? { reply_markup: { inline_keyboard: components } } : {})
        });
    }
    return message.reply({ text });
}

async function replyToComponent(interaction, text, components = []) {
    if (interaction?.callbackQuery) {
        await interaction.answerCbQuery();
        const source = interaction.callbackQuery.message;
        return interaction.reply(text, {
            ...(components.length ? { reply_markup: { inline_keyboard: components } } : {}),
            ...(source?.message_thread_id ? { message_thread_id: source.message_thread_id } : {})
        });
    }
    return interaction.reply({
        content: text,
        components,
        allowedMentions: { parse: [] },
        ephemeral: true
    });
}

async function alertComponent(interaction, text) {
    if (interaction?.callbackQuery) {
        return interaction.answerCbQuery(String(text).slice(0, 180), { show_alert: true });
    }
    return interaction.reply({ content: text, ephemeral: true });
}

async function updateComponentMessage(interaction, text, components = [], { acknowledge = true } = {}) {
    if (interaction?.callbackQuery) {
        if (acknowledge) await interaction.answerCbQuery();
        return interaction.editMessageText(text, {
            reply_markup: { inline_keyboard: components }
        });
    }
    const payload = { content: text, components, allowedMentions: { parse: [] } };
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply(payload);
    }
    return interaction.update(payload);
}

async function acknowledgeComponentUpdate(interaction) {
    if (interaction?.callbackQuery) {
        await interaction.answerCbQuery();
    } else if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
    }
}

async function showOrderAdminPage(interaction, platform, page, notice = "") {
    const payload = buildAdminOrderPage(platform, page, notice);
    return updateComponentMessage(interaction, payload.text, payload.components);
}

async function showSubscriptionAdminPage(interaction, platform, page, notice = "") {
    const payload = buildSubscriptionPage(platform, page, notice);
    return updateComponentMessage(interaction, payload.text, payload.components);
}

async function showOrderPlanPage(interaction, platform, orderId, page, notice = "") {
    const payload = buildOrderPlanPage(platform, orderId, page, notice);
    return updateComponentMessage(interaction, payload.text, payload.components);
}

function getSubscription(platform, subscriptionId) {
    return rental.listSubscriptions(platform).find(subscription =>
        subscription.id === String(subscriptionId) ||
        rental.displayId(subscription.id, "AS") === String(subscriptionId)
    ) || null;
}

function getClientOpenOrder(message, platform) {
    const scopeId = message.isPrivate ? null : rental.getScopeId(message);
    const orders = rental.getOpenOrders(platform, {
        scopeId,
        creatorId: scopeId ? null : message.userId
    });
    if (orders.length > 1) {
        throw new Error(
            `Há mais de um pedido aberto associado a esta conta. Informe o ID do pedido. IDs: ` +
            orders.map(order => rental.displayId(order.id, "AL")).join(", ")
        );
    }
    return orders[0] || null;
}

function formatOpenOrderInfo(order, prefix) {
    const status = order.status === "awaiting_payment"
        ? order.paymentReportedAt
            ? "pagamento informado; aguardando confirmação do SU"
            : "aguardando pagamento"
        : "aguardando o SU enviar a chave Pix";
    const lines = [
        `📥 Pedido em aberto: ${rental.displayId(order.id, "AL")} · ${status}`,
        `💎 ${order.planName} · ${rental.formatPrice(order.priceCents)} · ${rental.formatDuration(order.durationMs)}`,
        order.paymentExpiresAt
            ? `⏳ Prazo: ${new Date(order.paymentExpiresAt).toLocaleString("pt-BR")}`
            : null
    ].filter(Boolean);

    if (order.status === "pending") {
        lines.push("Aguarde o SU enviar a chave Pix.");
    } else if (order.paymentReportedAt) {
        lines.push("O SU foi avisado; aguarde a conferência do pagamento.");
    } else {
        lines.push(
            "Depois de receber a chave Pix e pagar, informe o pagamento com:",
            commandLine(`${prefix}alugar paguei`)
        );
    }

    lines.push("", "Para cancelar o pedido:", commandLine(`${prefix}alugar cancelar`));
    return lines.join("\n");
}

function formatActiveSubscriptionInfo(subscription, prefix) {
    if (!subscription) return "";
    const end = subscription.permanent
        ? "permanente"
        : `até ${new Date(subscription.expiresAt).toLocaleString("pt-BR")}`;
    return [
        `Assinatura atual: ${subscription.planName || "plano manual"} · ${end}.`,
        "Para renovar, escolha um plano e use:",
        commandLine(`${prefix}alugar renovar <ID-do-plano>`)
    ].join("\n");
}

async function handleRentalInteraction(interaction) {
    const componentId = interaction?.customId || interaction?.callbackQuery?.data || "";
    const parts = String(componentId).split(":");
    if (!["alugar", "alugarsu"].includes(parts[0])) return false;
    const commandName = parts[0];
    const [, action, ...args] = parts;
    const message = makeInteractionMessage(interaction);
    if (!message) return false;
    const platform = platformOf(message);
    const prefix = message.prefix || "!";

    if (action === "select") {
        if (commandName !== "alugar") return false;
        if (!canRequestOrder(message)) {
            await alertComponent(interaction, getOrderPermissionError(message));
            return true;
        }
        const [planId, type] = args;
        if (!["initial", "renewal"].includes(type)) return false;
        if (message.isPrivate || !rental.getScopeId(message) || !rental.getChatId(message)) {
            await replyToComponent(
                interaction,
                `Abra este comando no grupo/servidor onde deseja contratar:\n${commandLine(`${prefix}alugar`)}`
            );
            return true;
        }
        const plan = rental.getPlans(platform).find(item =>
            item.active !== false &&
            (item.id === planId || rental.displayId(item.id, "PL") === planId)
        );
        if (!plan) {
            await replyToComponent(interaction, "Este plano não está mais disponível. Consulte a lista atualizada.");
            return true;
        }
        if (rental.isAutomaticPixEnabled() && plan.priceCents > 0 &&
            !rental.getPayerEmail(platform, message.userId)) {
            await replyToComponent(
                interaction,
                `Antes de solicitar, cadastre seu e-mail na Conta Central pelo privado do bot:\n${commandLine(`${prefix}alugar email <seu-e-mail>`)}`
            );
            return true;
        }
        const scopeId = rental.getScopeId(message);
        const openOrders = rental.getOpenOrders(platform, { scopeId });
        if (openOrders.length) {
            await replyToComponent(
                interaction,
                formatOpenOrderInfo(openOrders[0], prefix)
            );
            return true;
        }
        const summary = [
            `🧾 Confirmar ${type === "renewal" ? "renovação" : "contratação"}`,
            `👤 Solicitante: ${getInteractionUserName(message)}`,
            `🏠 Grupo/servidor: ${scopeId}`,
            `💎 Plano: ${plan.name}`,
            `💰 Valor: ${rental.formatPrice(plan.priceCents)}`,
            `⏱ Duração: ${rental.formatDuration(plan.durationMs)}`,
            "",
            rental.isAutomaticPixEnabled() && plan.priceCents > 0
                ? "Confirme para criar o pedido. O Pix será gerado e enviado automaticamente no grupo/servidor e no seu privado."
                : "Confirme para criar o pedido. O SU enviará a chave Pix depois, no grupo/servidor e no seu privado."
        ].join("\n");
        const ownerId = message.userId;
        const snapshot = getPlanSnapshot(plan);
        const rows = makeComponentRows(platform, [[
            makeButton(
                "✅ Confirmar pedido",
                `alugar:confirm:${ownerId}:${plan.id}:${type}:${snapshot}`,
                ButtonStyle.Success
            ),
            makeButton("Cancelar", `alugar:cancel:${ownerId}`, ButtonStyle.Danger)
        ]]);
        await replyToComponent(interaction, summary, rows);
        return true;
    }

    if (action === "confirm") {
        if (commandName !== "alugar") return false;
        const [ownerId, planId, type, expectedSnapshot] = args;
        if (message.userId !== ownerId) {
            await alertComponent(interaction, "Esta confirmação pertence a outra pessoa.");
            return true;
        }
        if (!canRequestOrder(message)) {
            await alertComponent(interaction, getOrderPermissionError(message));
            return true;
        }
        if (!["initial", "renewal"].includes(type) ||
            message.isPrivate || !rental.getScopeId(message) || !rental.getChatId(message)) {
            await updateComponentMessage(
                interaction,
                `Não foi possível confirmar neste chat.\nAbra o comando no grupo/servidor desejado:\n${commandLine(`${prefix}alugar`)}`,
                []
            );
            return true;
        }
        const plan = rental.getPlans(platform).find(item =>
            item.active !== false &&
            (item.id === planId || rental.displayId(item.id, "PL") === planId)
        );
        if (!plan || getPlanSnapshot(plan) !== expectedSnapshot) {
            await updateComponentMessage(
                interaction,
                "⚠️ O plano ou seu preço mudou desde a confirmação. Consulte a lista atualizada e tente novamente.",
                []
            );
            return true;
        }
        try {
            const order = rental.createOrder(platform, {
                scopeId: rental.getScopeId(message),
                chatId: rental.getChatId(message),
                threadId: message.threadId || null,
                categoryId: message.categoryId || null,
                creatorId: message.userId,
                creatorName: getInteractionUserName(message),
                planId: plan.id,
                type
            });
            let automaticWarning = "";
            if (rental.isAutomaticPixEnabled() && order.priceCents > 0) {
                try {
                    const payment = await rental.sendAutomaticPix(platform, order.id, message.userId);
                    automaticWarning = payment.mercadoPagoDeliveryWarning
                        ? `\n⚠️ ${payment.mercadoPagoDeliveryWarning} O SU pode reenviar com ${prefix}alugarsu mercadopago reenviar ${rental.displayId(order.id, "AL")}.`
                        : "\n💠 Pix automático enviado no grupo/servidor e no seu privado.";
                } catch (error) {
                    console.error(`[ALUGUEL] Falha ao gerar Pix automático para ${platform}/${order.id}:`, error.message || error);
                    automaticWarning = "\n⚠️ Não consegui gerar ou enviar o Pix automático. O SU pode verificar o pedido e enviar uma chave manual.";
                }
            }
            await updateComponentMessage(
                interaction,
                `✅ Pedido ${rental.displayId(order.id, "AL")} criado.${automaticWarning || " O SU enviará a chave Pix no grupo/servidor e no seu privado."}\n` +
                `💎 ${order.planName} · ${rental.formatPrice(order.priceCents)} · ${rental.formatDuration(order.durationMs)}\n` +
                `Aguarde as instruções de pagamento. Consulte o andamento com:\n${commandLine(`${prefix}alugar status ${order.id}`)}`,
                []
            );
        } catch (error) {
            await updateComponentMessage(interaction, `❌ ${error.message || "Não foi possível criar o pedido."}`, []);
        }
        return true;
    }

    if (action === "cancel") {
        if (commandName !== "alugar") return false;
        const [ownerId] = args;
        if (message.userId !== ownerId) {
            await alertComponent(interaction, "Esta confirmação pertence a outra pessoa.");
            return true;
        }
        await updateComponentMessage(interaction, "Confirmação cancelada. Nenhum pedido foi criado.", []);
        return true;
    }

    if (action === "catalog") {
        if (commandName !== "alugar") return false;
        const [type, rawPage] = args;
        if (!["initial", "renewal"].includes(type)) return false;
        const plans = rental.getPlans(platform).filter(plan => plan.active !== false);
        const page = Math.max(0, Number.parseInt(rawPage, 10) || 0);
        const payload = buildPlanCatalogInteraction(platform, plans, type, page);
        return updateComponentMessage(interaction, payload.text, payload.components);
    }

    if (action === "paid" || action === "cancelorder") {
        if (commandName !== "alugar") return false;
        const [orderId] = args;
        const order = rental.getOrder(platform, orderId);
        if (!order) {
            await alertComponent(interaction, "Este pedido não existe ou não está mais disponível.");
            return true;
        }
        if (String(order.creatorId) !== String(message.userId)) {
            await alertComponent(interaction, "Somente quem solicitou este pedido pode usar estes botões.");
            return true;
        }
        try {
            if (action === "paid") {
                const result = await rental.reportOrderPayment(platform, order.id, message.userId);
                const paymentStatus = result.automaticApproved
                    ? `✅ Mercado Pago confirmou o pagamento do pedido ${rental.displayId(order.id, "AL")} e a assinatura foi ativada.`
                    : result.automaticPending
                        ? `⏳ O Mercado Pago ainda não confirmou o pagamento do pedido ${rental.displayId(order.id, "AL")}. O pedido permanece aberto e continuará sendo verificado automaticamente.`
                        : `✅ Seu aviso de pagamento foi registrado para o pedido ${rental.displayId(order.id, "AL")}. Aguarde a confirmação.`;
                await updateComponentMessage(
                    interaction,
                    `${paymentStatus}${result.warning ? `\n⚠️ ${result.warning}` : ""}`,
                    []
                );
            } else {
                const result = await rental.cancelOrderByCreator(platform, order.id, message.userId);
                await updateComponentMessage(
                    interaction,
                    `❌ Pedido ${rental.displayId(order.id, "AL")} cancelado.${result.warning ? `\n⚠️ ${result.warning}` : ""}`,
                    []
                );
            }
        } catch (error) {
            await alertComponent(interaction, error.message || "Não foi possível concluir esta ação.");
        }
        return true;
    }

    if (commandName !== "alugarsu") return false;
    if (!isSuperUser(message)) {
        await alertComponent(interaction, "❌ Somente o superusuário pode administrar pedidos e assinaturas.");
        return true;
    }

    if (action === "pixhelp") {
        const [orderId] = args;
        const order = rental.getOrder(platform, orderId);
        if (!order || (order.status !== "pending" &&
            !(order.status === "awaiting_payment" && order.paymentDeliveryWarning))) {
            await showOrderAdminPage(interaction, platform, 0, "❌ Este pedido não está aguardando o envio do Pix.");
            return true;
        }
        await alertComponent(
            interaction,
            `${order.paymentDeliveryWarning
                ? "Entrega parcial: reenvie a chave para tentar somente o destino pendente."
                : "Envie este comando no privado do bot:"}\n${commandLine(`${prefix}alugarsu pix ${rental.displayId(order.id, "AL")} <chave>`)}`
        );
        return true;
    }

    if (action === "orders") {
        const page = Math.max(0, Number.parseInt(args[0], 10) || 0);
        await showOrderAdminPage(interaction, platform, page);
        return true;
    }

    if (action === "subscriptions") {
        const page = Math.max(0, Number.parseInt(args[0], 10) || 0);
        await showSubscriptionAdminPage(interaction, platform, page);
        return true;
    }

    if (action === "editplan") {
        const [orderId, rawPage] = args;
        const page = Math.max(0, Number.parseInt(rawPage, 10) || 0);
        await showOrderPlanPage(interaction, platform, orderId, page);
        return true;
    }

    if (action === "setplan") {
        const [orderId, planId] = args;
        try {
            const order = rental.editOrder(platform, orderId, planId);
            await showOrderAdminPage(
                interaction,
                platform,
                0,
                `✅ Pedido ${rental.displayId(order.id, "AL")} atualizado para ${order.planName}.`
            );
        } catch (error) {
            await showOrderPlanPage(interaction, platform, orderId, 0, `❌ ${error.message || "Não foi possível editar o pedido."}`);
        }
        return true;
    }

    if (action === "approve") {
        const [orderId] = args;
        await acknowledgeComponentUpdate(interaction);
        try {
            const result = await rental.approveOrder(platform, orderId, message.userId);
            const notice = `✅ Pedido ${rental.displayId(result.order.id, "AL")} aprovado; assinatura ativa até ${new Date(result.subscription.expiresAt).toLocaleString("pt-BR")}.` +
                (result.warning ? ` ⚠️ ${result.warning}` : "");
            const payload = buildAdminOrderPage(platform, 0, notice);
            await updateComponentMessage(interaction, payload.text, payload.components, { acknowledge: false });
        } catch (error) {
            const payload = buildAdminOrderPage(platform, 0, `❌ ${error.message || "Não foi possível aprovar o pedido."}`);
            await updateComponentMessage(interaction, payload.text, payload.components, { acknowledge: false });
        }
        return true;
    }

    if (action === "reject") {
        const [orderId] = args;
        const order = rental.getOrder(platform, orderId);
        if (!order || !["pending", "awaiting_payment"].includes(order.status)) {
            await showOrderAdminPage(interaction, platform, 0, "❌ Este pedido não existe ou já foi decidido.");
            return true;
        }
        const actionText = rental.getSettings(platform).expiryAction === "leave"
            ? "o bot sairá do grupo/servidor"
            : "o bot permanecerá bloqueado neste grupo/servidor";
        const warning = order.type === "initial"
            ? `\n⚠️ ${actionText} conforme a configuração de expiração.`
            : "";
        const rows = makeComponentRows(platform, [[
            makeButton("Confirmar recusa", `alugarsu:rejectconfirm:${order.id}`, ButtonStyle.Danger),
            makeButton("Cancelar", "alugarsu:orders:0")
        ]]);
        await updateComponentMessage(
            interaction,
            `Recusar ${order.paymentKeySentAt ? "o pagamento do" : "o"} pedido ${rental.displayId(order.id, "AL")} de ${order.creatorName || order.creatorId}?${warning}`,
            rows
        );
        return true;
    }

    if (action === "rejectconfirm") {
        const [orderId] = args;
        await acknowledgeComponentUpdate(interaction);
        try {
            const order = await rental.rejectOrder(platform, orderId, message.userId);
            const payload = buildAdminOrderPage(
                platform,
                0,
                `Pedido ${rental.displayId(order.id, "AL")} recusado.${order.warning ? ` ⚠️ ${order.warning}` : ""}`
            );
            await updateComponentMessage(interaction, payload.text, payload.components, { acknowledge: false });
        } catch (error) {
            const payload = buildAdminOrderPage(platform, 0, `❌ ${error.message || "Não foi possível recusar o pedido."}`);
            await updateComponentMessage(interaction, payload.text, payload.components, { acknowledge: false });
        }
        return true;
    }

    if (action === "extend" || action === "permanent") {
        const [subscriptionId, rawDays] = args;
        const subscription = getSubscription(platform, subscriptionId);
        if (!subscription) {
            await showSubscriptionAdminPage(interaction, platform, 0, "❌ Assinatura não encontrada ou já removida.");
            return true;
        }
        try {
            if (action === "permanent") {
                rental.editSubscription(platform, subscription.id, { permanent: true });
                await showSubscriptionAdminPage(
                    interaction,
                    platform,
                    0,
                    `✅ Assinatura ${subscription.id} agora é permanente.`
                );
            } else {
                const days = Number(rawDays);
                if (!SUBSCRIPTION_EXTENSIONS.includes(days) || subscription.permanent) {
                    throw new Error("Esta opção de extensão não é válida para a assinatura.");
                }
                const currentExpiry = Number(subscription.expiresAt) || 0;
                const expiresAt = Math.max(Date.now(), currentExpiry) + days * rental.DAY_MS;
                rental.editSubscription(platform, subscription.id, { expiresAt });
                await showSubscriptionAdminPage(
                    interaction,
                    platform,
                    0,
                    `✅ Assinatura ${subscription.id} estendida por ${days} dias.`
                );
            }
        } catch (error) {
            await showSubscriptionAdminPage(
                interaction,
                platform,
                0,
                `❌ ${error.message || "Não foi possível editar a assinatura."}`
            );
        }
        return true;
    }

    if (action === "remove") {
        const [subscriptionId] = args;
        const subscription = getSubscription(platform, subscriptionId);
        if (!subscription) {
            await showSubscriptionAdminPage(interaction, platform, 0, "❌ Assinatura não encontrada ou já removida.");
            return true;
        }
        const rows = makeComponentRows(platform, [[
            makeButton("Confirmar remoção", `alugarsu:removeconfirm:${subscription.id}`, ButtonStyle.Danger),
            makeButton("Cancelar", "alugarsu:subscriptions:0")
        ]]);
        await updateComponentMessage(
            interaction,
            `Remover a assinatura ${subscription.id} de ${subscription.scopeId}?\n` +
            "⚠️ O acesso será bloqueado e o período de permanência começará agora.",
            rows
        );
        return true;
    }

    if (action === "removeconfirm") {
        const [subscriptionId] = args;
        await acknowledgeComponentUpdate(interaction);
        try {
            const subscription = await rental.deleteSubscription(platform, subscriptionId, message.userId);
            const payload = buildSubscriptionPage(
                platform,
                0,
                `⚠️ Assinatura ${subscription.id} removida e bloqueada.${subscription.warning ? ` ${subscription.warning}` : ""}`
            );
            await updateComponentMessage(interaction, payload.text, payload.components, { acknowledge: false });
        } catch (error) {
            const payload = buildSubscriptionPage(platform, 0, `❌ ${error.message || "Não foi possível remover a assinatura."}`);
            await updateComponentMessage(interaction, payload.text, payload.components, { acknowledge: false });
        }
        return true;
    }

    return false;
}

function buildPlanCatalogInteraction(platform, plans, type, page = 0) {
    const pages = Math.max(1, Math.ceil(plans.length / RENTAL_PAGE_SIZE));
    const currentPage = Math.min(Math.max(0, page), pages - 1);
    const visible = plans.slice(currentPage * RENTAL_PAGE_SIZE, (currentPage + 1) * RENTAL_PAGE_SIZE);
    const rows = createPlanChoiceRows(platform, plans, type, currentPage);
    const text = [
        `💎 Planos de aluguel — ${type === "renewal" ? "renovação" : "contratação"}`,
        visible.length
            ? visible.map(plan =>
                `${rental.displayId(plan.id, "PL")} · ${plan.name} · ${rental.formatPrice(plan.priceCents)} · ${rental.formatDuration(plan.durationMs)}`
            ).join("\n")
            : "Nenhum plano de aluguel está disponível.",
        ...(pages > 1 ? [`Página ${currentPage + 1}/${pages}`] : []),
        ...(visible.length ? ["Etapa 2 — para contratar, escolha um plano pelos botões."] : [])
    ].join("\n\n");
    return { text, components: rows };
}

function createPaymentActionComponents(platform, orderId) {
    if (!["discord", "telegram"].includes(platform)) return [];
    return makeComponentRows(platform, [[
        makeButton("✅ Já paguei", `alugar:paid:${orderId}`, ButtonStyle.Success),
        makeButton("❌ Cancelar pedido", `alugar:cancelorder:${orderId}`, ButtonStyle.Danger)
    ]]);
}

async function executeSuperUser(message) {
    if (!isSuperUser(message)) {
        return reply(message, "❌ Somente o superusuário pode usar este comando.");
    }
    const args = message.args || [];
    return runSuperUserCommand(message, args, message.command === "modoaluguel");
}

async function runSuperUserCommand(message, args, isModeAlias) {
    const platform = platformOf(message);
    const prefix = message.prefix || "!";
    const commandPrefix = `${prefix}${isModeAlias ? "modoaluguel" : "alugarsu"}`;
    const groupId = rental.getScopeId(message);
    const chatId = rental.getChatId(message);
    const actorId = String(message.userId || "");
    const action = isModeAlias ? "modo" : String(args[0] || "").toLowerCase();
    const rest = isModeAlias ? args : args.slice(1);

    if (action === "mercadopago" || action === "mercado" || action === "mp") {
        const operation = action === "mercado" && String(rest[0] || "").toLowerCase() === "pago"
            ? String(rest[1] || "status").toLowerCase()
            : String(rest[0] || "status").toLowerCase();
        const values = action === "mercado" && String(rest[0] || "").toLowerCase() === "pago"
            ? rest.slice(2)
            : rest.slice(1);
        const privateOnly = new Set(["token"]);
        if (privateOnly.has(operation) && !message.isPrivate) {
            return reply(message, "Por segurança, configure credenciais do Mercado Pago somente no privado do bot.");
        }
        if (operation === "status" || operation === "config") {
            const settings = mercadoPago.getPublicSettings();
            return reply(message, [
                `Mercado Pago: ${settings.automaticEnabled ? "automático ativo" : "automático desativado"}`,
                `Token de acesso: ${settings.accessTokenConfigured ? "configurado" : "não configurado"}`,
                "Verificação dos pagamentos: automática a cada minuto e ao clicar em Já paguei.",
                "Comandos de configuração:",
                commandLine(`${commandPrefix} mercadopago token <token|remover>`),
                commandLine(`${commandPrefix} mercadopago automatico <on|off>`)
            ].join("\n"));
        }
        if (operation === "token") {
            const value = values.join(" ").trim();
            const clearing = ["remover", "limpar", "apagar"].includes(value.toLowerCase());
            if (!value) {
                return reply(message, `Uso:\n${commandLine(`${commandPrefix} mercadopago ${operation} <valor|remover>`)}`);
            }
            const settings = mercadoPago.updateSettings(
                clearing ? { clearAccessToken: true } : { accessToken: value }
            );
            return reply(message, `Token ${clearing ? "removido" : "salvo"}${settings.automaticEnabled ? "." : ". A cobrança automática permanece desativada."}`);
        }
        if (operation === "automatico" || operation === "automatic") {
            const mode = String(values[0] || "").toLowerCase();
            if (!["on", "off", "ativar", "desativar"].includes(mode)) {
                return reply(message, `Uso:\n${commandLine(`${commandPrefix} mercadopago automatico <on|off>`)}`);
            }
            const settings = mercadoPago.updateSettings({
                automaticEnabled: mode === "on" || mode === "ativar"
            });
            return reply(message, `✅ Cobrança automática do Mercado Pago ${settings.automaticEnabled ? "ativada" : "desativada"}.`);
        }
        if (operation === "reenviar") {
            if (!values[0]) {
                return reply(message, `Uso:\n${commandLine(`${commandPrefix} mercadopago reenviar <ID-do-pedido>`)}`);
            }
            const order = await rental.sendAutomaticPix(platform, values[0], actorId);
            return reply(message, order.mercadoPagoDeliveryWarning
                ? `⚠️ ${order.mercadoPagoDeliveryWarning}`
                : "✅ Pix automático reenviado nos destinos pendentes.");
        }
        return reply(message, [
            "Configuração do Mercado Pago:",
            commandLine(`${commandPrefix} mercadopago status`),
            commandLine(`${commandPrefix} mercadopago token <token>`),
            commandLine(`${commandPrefix} mercadopago automatico <on|off>`),
            commandLine(`${commandPrefix} mercadopago reenviar <ID-do-pedido>`)
        ].join("\n"));
    }

    if (action === "modo") {
        const mode = String(rest[0] || "").toLowerCase();
        if (mode !== "on" && mode !== "off") {
            return reply(message, `Uso:\n${commandLine(`${commandPrefix} modo <on|off>`)}`);
        }
        const wasEnabled = rental.getSettings(platform).enabled;
        const settings = rental.setSettings(platform, { enabled: mode === "on" });
        if (!wasEnabled && settings.enabled) {
            await rental.runMaintenance();
        }
        let warning = "";
        if (wasEnabled && !settings.enabled) {
            const active = rental.listSubscriptions(platform).filter(subscription =>
                subscription.permanent || Number(subscription.expiresAt) > Date.now()
            );
            const notice = `ℹ️ O modo de aluguel foi desligado em ${platform}. Há ${active.length} assinatura(s) ativa(s):\n${active.slice(0, 20).map(formatSubscription).join("\n") || "Nenhuma."}`;
            try {
                await send.text(platform, actorId, null, notice);
            } catch (error) {
                warning = `\n⚠️ Não consegui enviar o aviso no privado: ${error.message || error}`;
            }
        }
        return reply(message, `✅ Modo de aluguel ${settings.enabled ? "ativado" : "desativado"}.${warning}`);
    }

    if (action === "config" || action === "permanencia" || action === "aviso" ||
        action === "expiracao" || action === "mensagem") {
        const setting = action === "config" ? String(rest[0] || "").toLowerCase() : action;
        const value = action === "config" ? rest.slice(1) : rest;
        if (setting === "permanencia") {
            const duration = rental.parseDuration(value[0]);
            rental.setSettings(platform, { presenceDurationMs: duration });
            return reply(message, `✅ Permanência configurada para ${rental.formatDuration(duration)}.`);
        }
        if (setting === "aviso") {
            const days = Number(value[0]);
            if (!Number.isSafeInteger(days)) throw new Error("Informe a antecedência em dias inteiros.");
            rental.setSettings(platform, { noticeDays: days });
            return reply(message, `✅ Avisos de vencimento configurados para ${days} dia(s) antes, uma vez por dia.`);
        }
        if (setting === "expiracao") {
            const mode = String(value[0] || "").toLowerCase();
            const expiryAction = mode === "sair" ? "leave" : mode === "bloquear" ? "block" : null;
            if (!expiryAction) return reply(message, `Uso:\n${commandLine(`${commandPrefix} expiracao <bloquear|sair>`)}`);
            rental.setSettings(platform, { expiryAction });
            return reply(message, `✅ Após a permanência, o bot ${expiryAction === "leave" ? "sairá do grupo/servidor" : "permanecerá bloqueado pelo OnlyChats"}.`);
        }
        if (setting === "mensagem") {
            const text = value.join(" ").trim();
            if (!text) return reply(message, `Uso:\n${commandLine(`${commandPrefix} mensagem <texto>`)}\nPlaceholders disponíveis: {plans}, {prefix}, {bot}, {presence}`);
            rental.setSettings(platform, { welcomeMessage: text });
            return reply(message, "✅ Mensagem de apresentação do aluguel atualizada.");
        }
        return reply(message, `Configuração: permanência ${rental.formatDuration(rental.getSettings(platform).presenceDurationMs)}, aviso ${rental.getSettings(platform).noticeDays} dia(s), expiração ${rental.getSettings(platform).expiryAction}.`);
    }

    if (action === "plano" || action === "planos") {
        const operation = action === "planos" ? "listar" : String(rest[0] || "listar").toLowerCase();
        const values = action === "planos" ? [] : rest.slice(1);
        if (operation === "listar" || operation === "list") {
            const plans = rental.getPlans(platform);
            return replyPlanCatalog(message, plans, {
                title: "Planos cadastrados",
                emptyText: `Nenhum plano cadastrado.\nCrie um com:\n${commandLine(`${commandPrefix} plano criar <nome> <preço> <duração>`)}`
            });
        }
        if (operation === "criar" || operation === "create") {
            if (values.length < 3) return reply(message, `Uso:\n${commandLine(`${commandPrefix} plano criar <nome> <preço> <duração>`)}`);
            const durationMs = rental.parseDuration(values[values.length - 1]);
            const priceCents = parsePrice(values[values.length - 2]);
            const name = values.slice(0, -2).join(" ");
            const plan = rental.createPlan(platform, { name, priceCents, durationMs });
            return reply(message, `✅ Plano ${rental.displayId(plan.id, "PL")} criado: ${plan.name}, ${rental.formatPrice(plan.priceCents)} por ${rental.formatDuration(plan.durationMs)}.`);
        }
        if (operation === "editar" || operation === "edit") {
            if (values.length < 4) return reply(message, `Uso:\n${commandLine(`${commandPrefix} plano editar <ID> <nome> <preço> <duração>`)}`);
            const durationMs = rental.parseDuration(values[values.length - 1]);
            const priceCents = parsePrice(values[values.length - 2]);
            const name = values.slice(1, -2).join(" ");
            const plan = rental.editPlan(platform, values[0], { name, priceCents, durationMs });
            return reply(message, `✅ Plano ${rental.displayId(plan.id, "PL")} atualizado.`);
        }
        if (operation === "apagar" || operation === "delete") {
            if (!values[0]) return reply(message, `Uso:\n${commandLine(`${commandPrefix} plano apagar <ID>`)}`);
            rental.deletePlan(platform, values[0]);
            return reply(message, `✅ Plano ${values[0]} apagado. Pedidos existentes mantêm os dados do plano que escolheram.`);
        }
        return reply(message, [
            "Escolha uma operação:",
            commandLine(`${commandPrefix} plano listar`),
            commandLine(`${commandPrefix} plano criar <nome> <preço> <duração>`),
            commandLine(`${commandPrefix} plano editar <ID> <nome> <preço> <duração>`),
            commandLine(`${commandPrefix} plano apagar <ID>`)
        ].join("\n"));
    }

    if (action === "pedidos") {
        const payload = buildAdminOrderPage(platform, 0);
        return replyWithControls(message, payload.text, payload.components);
    }
    if (action === "pix" || action === "enviarpix") {
        if (rest.length < 2) return reply(message, `Uso:\n${commandLine(`${commandPrefix} pix <ID-do-pedido> <chave Pix>`)}`);
        const order = await rental.sendPaymentKey(platform, rest[0], rest.slice(1).join(" "), actorId);
        return reply(message, [
            `${order.paymentDeliveryWarning ? "⚠️" : "✅"} Chave Pix do pedido ${rental.displayId(order.id, "AL")} ${order.paymentDeliveryWarning ? `enviada parcialmente: ${order.paymentDeliveryWarning}` : "enviada no grupo/servidor e no privado do solicitante."}`,
            order.paymentDeliveryWarning ? "Para reenviar ao destino pendente, use:" : null,
            order.paymentDeliveryWarning
                ? commandLine(`${commandPrefix} pix ${rental.displayId(order.id, "AL")} <chave Pix>`)
                : null,
            `⏳ Prazo: ${new Date(order.paymentExpiresAt).toLocaleString("pt-BR")}.`
        ].filter(Boolean).join("\n"));
    }
    if (action === "aceitar" || action === "aprovar" || action === "pago" || action === "pagamento") {
        if (!rest[0]) return reply(message, `Uso:\n${commandLine(`${commandPrefix} pago <ID-do-pedido>`)}`);
        const result = await rental.approveOrder(platform, rest[0], actorId);
        return reply(message, `✅ Pagamento confirmado e pedido ${rental.displayId(result.order.id, "AL")} aprovado. A assinatura termina em ${new Date(result.subscription.expiresAt).toLocaleString("pt-BR")}.${result.warning ? `\n⚠️ ${result.warning}` : ""}`);
    }
    if (action === "recusar") {
        if (!rest[0]) return reply(message, `Uso:\n${commandLine(`${commandPrefix} recusar <ID-do-pedido>`)}`);
        const order = await rental.rejectOrder(platform, rest[0], actorId);
        return reply(message, `Pedido ${rental.displayId(order.id, "AL")} recusado.${order.warning ? `\n⚠️ ${order.warning}` : ""}`);
    }
    if (action === "editarpedido") {
        if (!rest[0] || !rest[1]) return reply(message, `Uso:\n${commandLine(`${commandPrefix} editarpedido <ID-do-pedido> <ID-do-plano>`)}`);
        const order = rental.editOrder(platform, rest[0], rest[1]);
        return reply(message, `✅ Pedido ${rental.displayId(order.id, "AL")} atualizado para o plano ${order.planName}.`);
    }
    if (action === "apagarpedido") {
        if (!rest[0]) return reply(message, `Uso:\n${commandLine(`${commandPrefix} apagarpedido <ID-do-pedido>`)}`);
        const order = rental.deleteOrder(platform, rest[0]);
        return reply(message, `✅ Pedido ${rental.displayId(order.id, "AL")} apagado.`);
    }
    if (action === "assinaturas") {
        const payload = buildSubscriptionPage(platform, 0);
        return replyWithControls(message, payload.text, payload.components);
    }
    if (action === "conceder") {
        if (rest.length < 2) return reply(message, `Uso:\n${commandLine(`${commandPrefix} conceder <ID-do-grupo-ou-servidor> <ID-do-plano> [ID-do-chat/canal]`)}`);
        const chatId = rest[2] || (message.isPrivate ? "" : rental.getChatId(message));
        if (!chatId) return reply(message, `Informe o ID do chat/canal de avisos.\nUse:\n${commandLine(`${commandPrefix} conceder <grupo> <plano> <chat/canal>`)}`);
        const subscription = rental.createSubscription(platform, {
            scopeId: rest[0],
            planId: rest[1],
            chatId,
            creatorId: actorId,
            createdBy: actorId
        });
        const failures = await rental.notifySubscription(
            platform,
            subscription,
            `✅ A assinatura ${subscription.id} foi ativada até ${new Date(subscription.expiresAt).toLocaleString("pt-BR")}.`
        );
        return reply(message, `✅ Assinatura ${subscription.id} concedida até ${new Date(subscription.expiresAt).toLocaleString("pt-BR")}.${failures.length ? `\n⚠️ ${failures.join(" ")}` : ""}`);
    }
    if (action === "editarassinatura") {
        if (rest.length < 2) return reply(message, `Uso:\n${commandLine(`${commandPrefix} editarassinatura <ID-da-assinatura> <duração|permanente>`)}`);
        const updates = String(rest[1]).toLowerCase() === "permanente"
            ? { permanent: true }
            : { durationMs: rental.parseDuration(rest[1]) };
        const subscription = rental.editSubscription(platform, rest[0], updates);
        return reply(message, `✅ Assinatura ${subscription.id} atualizada${subscription.permanent ? " para permanente" : ` até ${new Date(subscription.expiresAt).toLocaleString("pt-BR")}`}.`);
    }
    if (action === "apagarassinatura" || action === "apagarsignatura" || action === "apagarsub") {
        if (!rest[0]) return reply(message, `Uso:\n${commandLine(`${commandPrefix} apagarassinatura <ID-da-assinatura>`)}`);
        const subscription = await rental.deleteSubscription(platform, rest[0], actorId);
        return reply(message, `⚠️ Assinatura ${subscription.id} removida e bloqueada. O prazo de permanência foi iniciado.${subscription.warning ? `\n⚠️ ${subscription.warning}` : ""}`);
    }
    if (action === "sair") {
        const destination = rest[0] || groupId;
        if (!destination) return reply(message, `Uso:\n${commandLine(`${commandPrefix} sair <ID-do-grupo-ou-servidor>`)}`);
        await rental.leaveChat(platform, destination);
        return reply(message, `✅ O bot saiu de ${destination}.`);
    }
    if (action === "status") {
        if (rest[0]) {
            const order = rental.getOrder(platform, rest[0]);
            if (!order) return reply(message, "Pedido não encontrado.");
            return reply(message, `Status do pedido ${rental.displayId(order.id, "AL")}: ${order.status}\nPlano: ${order.planName} · ${rental.formatDuration(order.durationMs)}\nCriado em: ${new Date(order.createdAt).toLocaleString("pt-BR")}`);
        }
        const settings = rental.getSettings(platform);
        const pendingOrders = rental.listOrders(platform, "pending").length;
        const paymentOrders = rental.listOrders(platform, "awaiting_payment").length;
        const subscriptions = rental.listSubscriptions(platform);
        return reply(message, `Modo: ${settings.enabled ? "ativo" : "desativado"}\nPlanos: ${rental.getPlans(platform).length}\nPedidos aguardando Pix: ${pendingOrders}\nPedidos aguardando pagamento: ${paymentOrders}\nAssinaturas: ${subscriptions.length}`);
    }
    return reply(message, [
        "Comandos do SU:",
        commandLine(`${commandPrefix} modo <on|off>`),
        commandLine(`${commandPrefix} plano listar`),
        commandLine(`${commandPrefix} plano criar <nome> <preço> <duração>`),
        commandLine(`${commandPrefix} plano editar <ID> <nome> <preço> <duração>`),
        commandLine(`${commandPrefix} plano apagar <ID>`),
        commandLine(`${commandPrefix} pedidos`),
        commandLine(`${commandPrefix} pix <ID> <chave Pix>`),
        commandLine(`${commandPrefix} pago <ID>`),
        commandLine(`${commandPrefix} recusar <ID>`),
        commandLine(`${commandPrefix} editarpedido <ID> <ID-do-plano>`),
        commandLine(`${commandPrefix} apagarpedido <ID>`),
        commandLine(`${commandPrefix} assinaturas`),
        commandLine(`${commandPrefix} conceder <grupo> <plano> <chat/canal>`),
        commandLine(`${commandPrefix} editarassinatura <ID> <duração|permanente>`),
        commandLine(`${commandPrefix} apagarassinatura <ID>`),
        commandLine(`${commandPrefix} status`),
        commandLine(`${commandPrefix} status <ID-do-pedido>`),
        commandLine(`${commandPrefix} mercadopago status`),
        commandLine(`${commandPrefix} mercadopago automatico <on|off>`),
        commandLine(`${commandPrefix} mercadopago reenviar <ID>`),
        commandLine(`${commandPrefix} permanencia <duração>`),
        commandLine(`${commandPrefix} aviso <dias>`),
        commandLine(`${commandPrefix} expiracao <bloquear|sair>`),
        commandLine(`${commandPrefix} sair <ID-do-grupo-ou-servidor>`),
        "",
        "O Pix também é enviado no grupo/servidor e no privado do solicitante.",
        "O solicitante pode informar que pagou com:",
        commandLine(`${prefix}alugar paguei`),
        "Ou cancelar o pedido com:",
        commandLine(`${prefix}alugar cancelar`),
        "Confirme o pagamento somente após verificar o recebimento."
    ].join("\n"));
}

module.exports = {
    name: "alugar",
    aliases: [],
    category: "system/configurações",
    description: "Consulte planos e solicite aluguel ou renovação; comandos administrativos ficam em alugarsu.",
    usage: "{prefix}alugar [contratar|renovar|paguei|cancelar|status|ajuda]",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },

    createPlanChoiceComponents(platform, plans = rental.getPlans(platform), type = "initial", page = 0) {
        return createPlanChoiceRows(platform, plans.filter(plan => plan.active !== false), type, page);
    },

    async handleInteraction(interaction) {
        return handleRentalInteraction(interaction);
    },

    createPaymentActionComponents,

    executeSuperUser,

    async execute(message) {
        const args = message.args || [];
        const publicAction = String(args[0] || "").toLowerCase();
        const platform = platformOf(message);
        const superUserActions = new Set([
            "modo", "config", "permanencia", "aviso", "expiracao", "mensagem",
            "mercadopago", "mercado", "mp",
            "plano", "pedidos", "aceitar", "aprovar", "pago", "pagamento",
            "pix", "enviarpix", "recusar", "editarpedido", "apagarpedido",
            "assinaturas", "conceder", "editarassinatura", "apagarassinatura",
            "apagarsignatura", "apagarsub", "sair"
        ]);
        if (superUserActions.has(publicAction)) {
            return reply(message, `Este comando é exclusivo do SU. Use:\n${commandLine(`${message.prefix || "!"}alugarsu ${args.join(" ")}`)}`);
        }
        if (publicAction === "email") {
            if (!message.isPrivate) {
                return reply(message, `Por segurança, cadastre ou remova seu e-mail somente no privado do bot:\n${commandLine(`${message.prefix || "!"}alugar email <seu-e-mail>`)}`);
            }
            if (!message.userId) return reply(message, "Não consegui identificar sua conta nesta plataforma.");
            const store = message.functions?.centralAccounts || global.centralAccounts || centralAccounts;
            const account = await store.getOrCreateByPlatform(platform, String(message.userId), {
                username: message.username || null,
                displayName: message.displayName || message.sender?.name || null
            });
            const value = String(args[1] || "").trim();
            if (["remover", "limpar", "apagar"].includes(value.toLowerCase())) {
                const removed = await store.removeEmail(account.id);
                return reply(message, removed
                    ? "✅ E-mail removido da Conta Central."
                    : "A Conta Central não tinha um e-mail cadastrado.");
            }
            if (!value) {
                const email = account.email;
                const masked = email
                    ? `${email.slice(0, 1)}${"*".repeat(Math.max(2, email.indexOf("@") - 1))}${email.slice(email.indexOf("@"))}`
                    : null;
                return reply(message, masked
                    ? `E-mail da Conta Central: ${masked}\nPara alterar:\n${commandLine(`${message.prefix || "!"}alugar email <novo-e-mail>`)}\nPara remover:\n${commandLine(`${message.prefix || "!"}alugar email remover`)}`
                    : `Nenhum e-mail cadastrado.\nPara cadastrar:\n${commandLine(`${message.prefix || "!"}alugar email <seu-e-mail>`)}`);
            }
            const email = await store.setEmail(account.id, value);
            return reply(message, `✅ E-mail ${email.slice(0, 1)}${"*".repeat(Math.max(2, email.indexOf("@") - 1))}${email.slice(email.indexOf("@"))} salvo somente na Conta Central.`);
        }
        if (publicAction === "ajuda" || publicAction === "help") {
            const prefix = message.prefix || "!";
            return reply(message, [
                "Comandos do cliente (WhatsApp, Telegram e Discord):",
                commandLine(`${prefix}alugar`),
                "Consultar os planos disponíveis.",
                "",
                commandLine(`${prefix}alugar contratar <ID-do-plano>`),
                "Solicitar contratação no grupo/servidor.",
                "",
                commandLine(`${prefix}alugar renovar <ID-do-plano>`),
                "Solicitar renovação no grupo/servidor.",
                "",
                commandLine(`${prefix}alugar status [ID-do-pedido]`),
                "Consultar o pedido aberto ou a assinatura do grupo.",
                "",
                commandLine(`${prefix}alugar paguei [ID-do-pedido]`),
                "Avisar o SU após pagar.",
                "",
                commandLine(`${prefix}alugar cancelar [ID-do-pedido]`),
                "Cancelar seu pedido aberto.",
                "",
                commandLine(`${prefix}alugar email <seu-e-mail>`),
                "Cadastrar o e-mail na Conta Central (somente no privado) para pagamentos automáticos.",
                "",
                commandLine(`${prefix}alugar email remover`),
                "Remover o e-mail salvo na Conta Central.",
                "",
                `O SU envia a chave com:\n${commandLine(`${prefix}alugarsu pix <ID-do-pedido> <chave-Pix>`)}`,
                `Após verificar o recebimento, o SU confirma com:\n${commandLine(`${prefix}alugarsu pago <ID-do-pedido>`)}`
            ].join("\n"));
        }
        if (publicAction === "status") {
            const orderId = String(args[1] || "");
            if (!orderId) {
                try {
                    const openOrder = getClientOpenOrder(message, platform);
                    if (openOrder) return reply(message, formatOpenOrderInfo(openOrder, message.prefix || "!"));
                } catch (error) {
                    return reply(message, `❌ ${error.message}`);
                }
                const scopeId = message.isPrivate ? null : rental.getScopeId(message);
                const subscriptions = scopeId
                    ? [rental.getActiveSubscription(platform, scopeId)].filter(Boolean)
                    : rental.listSubscriptions(platform).filter(item =>
                        String(item.creatorId) === String(message.userId) &&
                        (item.permanent || Number(item.expiresAt) > Date.now())
                    ).sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
                if (subscriptions.length) {
                    return reply(message, subscriptions.map(activeSubscription => {
                        const end = activeSubscription.permanent
                            ? "permanente"
                            : new Date(activeSubscription.expiresAt).toLocaleString("pt-BR");
                        return [
                            `✅ Assinatura ativa: ${activeSubscription.planName || "plano manual"}`,
                            `🏠 Grupo/servidor: ${activeSubscription.scopeId}`,
                            `📅 ${activeSubscription.permanent ? "Sem vencimento" : `Válida até ${end}`}`,
                            `🆔 Assinatura: ${rental.displayId(activeSubscription.id, "AS")}`
                        ].join("\n");
                    }).join("\n\n"));
                }
                return reply(message, [
                    "Não encontrei pedido em aberto ou assinatura ativa para este grupo/servidor.",
                    "Para consultar os planos:",
                    commandLine(`${message.prefix || "!"}alugar`)
                ].join("\n"));
            }
            const order = rental.getOrder(platform, orderId);
            if (!order) return reply(message, "Pedido não encontrado.");
            if (!isSuperUser(message) && String(order.creatorId) !== String(message.userId)) {
                return reply(message, "Você só pode consultar pedidos criados pela sua conta.");
            }
            const orderStatus = order.status === "awaiting_payment" && order.paymentReportedAt
                ? "pagamento informado; aguardando confirmação do SU"
                : order.status === "awaiting_payment"
                    ? "aguardando pagamento"
                    : order.status;
            return reply(message, `Status do pedido ${rental.displayId(order.id, "AL")}: ${orderStatus}\nPlano: ${order.planName} · ${rental.formatDuration(order.durationMs)}\nCriado em: ${new Date(order.createdAt).toLocaleString("pt-BR")}`);
        }

        if (publicAction === "paguei" || publicAction === "informarpagamento") {
            try {
                const order = args[1]
                    ? rental.getOrder(platform, args[1])
                    : getClientOpenOrder(message, platform);
                if (!order) return reply(message, "Não encontrei pedido aberto neste grupo/servidor. Informe o ID do pedido, se estiver usando o privado.");
                const result = await rental.reportOrderPayment(platform, order.id, message.userId);
                const paymentStatus = result.automaticApproved
                    ? `✅ Mercado Pago confirmou o pagamento do pedido ${rental.displayId(result.order.id, "AL")} e a assinatura foi ativada.`
                    : result.automaticPending
                        ? `⏳ O Mercado Pago ainda não confirmou o pagamento do pedido ${rental.displayId(result.order.id, "AL")}. O pedido permanece aberto e continuará sendo verificado automaticamente.`
                        : `✅ Seu aviso de pagamento foi registrado para o pedido ${rental.displayId(result.order.id, "AL")}. Aguarde a confirmação.`;
                return reply(message, `${paymentStatus}${result.warning ? `\n⚠️ ${result.warning}` : ""}`);
            } catch (error) {
                return reply(message, `❌ ${error.message || "Não foi possível informar o pagamento."}`);
            }
        }
        if (publicAction === "cancelar" || publicAction === "cancel") {
            try {
                const order = args[1]
                    ? rental.getOrder(platform, args[1])
                    : getClientOpenOrder(message, platform);
                if (!order) return reply(message, "Não encontrei pedido aberto neste grupo/servidor. Informe o ID do pedido, se estiver usando o privado.");
                const result = await rental.cancelOrderByCreator(platform, order.id, message.userId);
                return reply(message, `❌ Pedido ${rental.displayId(result.order.id, "AL")} cancelado.${result.warning ? `\n⚠️ ${result.warning}` : ""}`);
            } catch (error) {
                return reply(message, `❌ ${error.message || "Não foi possível cancelar o pedido."}`);
            }
        }

        if (publicAction === "contratar" || publicAction === "comprar" || publicAction === "renovar") {
            if (message.isPrivate) {
                const prefix = message.prefix || "!";
                return reply(message, [
                    "Para iniciar um pedido, adicione o bot ao grupo/servidor e execute o comando lá:",
                    commandLine(`${prefix}alugar contratar <ID-do-plano>`),
                    "",
                    "Para consultar os planos no privado:",
                    commandLine(`${prefix}alugar`),
                    "",
                    "Para falar com o dono:",
                    commandLine(`${prefix}dono`)
                ].join("\n"));
            }
            const scopeId = rental.getScopeId(message);
            if (scopeId) {
                const openOrders = rental.getOpenOrders(platform, { scopeId });
                if (openOrders.length) {
                    return reply(message, formatOpenOrderInfo(openOrders[0], message.prefix || "!"));
                }
            }
            if (!args[1]) {
                const plans = rental.getPlans(platform).filter(plan => plan.active !== false);
                const activeSubscription = scopeId
                    ? rental.getActiveSubscription(platform, scopeId)
                    : null;
                if (publicAction !== "renovar" && activeSubscription) {
                    return reply(message, [
                        formatActiveSubscriptionInfo(activeSubscription, message.prefix || "!"),
                        "Para renovar, use:",
                        commandLine(`${message.prefix || "!"}alugar renovar`)
                    ].join("\n"));
                }
                return replyPlanCatalog(message, plans, {
                    title: publicAction === "renovar" ? "Planos para renovação" : "Planos de aluguel",
                    emptyText: "Nenhum plano de aluguel está disponível no momento.",
                    type: publicAction === "renovar" ? "renewal" : "initial",
                    footer: [
                        activeSubscription ? formatActiveSubscriptionInfo(activeSubscription, message.prefix || "!") : "",
                        ...(plans.length && !activeSubscription ? [
                            message.platform === "whatsapp"
                                ? `Etapa 2 — para ${publicAction === "renovar" ? "renovar" : "contratar"}, use:`
                                : `Etapa 2 — para ${publicAction === "renovar" ? "renovar" : "contratar"}, escolha um plano pelos botões ou use:`,
                            commandLine(`${message.prefix || "!"}alugar ${publicAction} <ID>`)
                        ] : [])
                    ].filter(Boolean).join("\n")
                });
            }
            const chatId = rental.getChatId(message);
            if (!scopeId || !chatId) return reply(message, "Não consegui identificar o grupo ou servidor.");
            if (!canRequestOrder(message)) {
                return reply(message, "❌ Somente administradores do grupo/servidor podem solicitar um aluguel.");
            }
            const creatorId = String(message.userId || "");
            if (!creatorId) return reply(message, "Não consegui identificar sua conta nesta plataforma.");
            try {
                const order = rental.createOrder(platform, {
                    scopeId,
                    chatId,
                    threadId: message.threadId || message.topicId || null,
                    categoryId: message.categoryId || null,
                    creatorId,
                    creatorName: message.sender?.name || message.sender?.pushName || creatorId,
                    planId: args[1],
                    type: publicAction === "renovar" ? "renewal" : "initial"
                });
                let paymentNotice = "";
                if (rental.isAutomaticPixEnabled() && order.priceCents > 0) {
                    try {
                        const payment = await rental.sendAutomaticPix(platform, order.id, creatorId);
                        paymentNotice = payment.mercadoPagoDeliveryWarning
                            ? `\n⚠️ ${payment.mercadoPagoDeliveryWarning} O SU pode reenviar com ${message.prefix || "!"}alugarsu mercadopago reenviar ${rental.displayId(order.id, "AL")}.`
                            : "\n💠 Pix automático enviado no grupo/servidor e no seu privado.";
                    } catch (error) {
                        console.error(`[ALUGUEL] Falha ao gerar Pix automático para ${platform}/${order.id}:`, error.message || error);
                        paymentNotice = "\n⚠️ Não consegui gerar ou enviar o Pix automático. O SU pode verificar o pedido e enviar uma chave manual.";
                    }
                }
                return reply(message, [
                    `✅ Pedido ${rental.displayId(order.id, "AL")} criado.${paymentNotice || " O SU enviará a chave Pix no grupo/servidor e no seu privado."}`,
                    `💎 Plano: ${order.planName} · ${rental.formatPrice(order.priceCents)} · ${rental.formatDuration(order.durationMs)}`,
                    "Aguarde as instruções de pagamento."
                ].join("\n"));
            } catch (error) {
                return reply(message, `❌ ${error.message || "Não foi possível criar o pedido."}`);
            }
        }

        const prefix = message.prefix || "!";
        const scopeId = message.isPrivate ? null : rental.getScopeId(message);
        if (scopeId) {
            const openOrders = rental.getOpenOrders(platform, { scopeId });
            if (openOrders.length) {
                return reply(message, formatOpenOrderInfo(openOrders[0], prefix));
            }
        }
        const plans = rental.getPlans(platform).filter(plan => plan.active !== false);
        const activeSubscription = scopeId
            ? rental.getActiveSubscription(platform, scopeId)
            : null;
        return replyPlanCatalog(message, plans, {
            title: activeSubscription ? "Planos para renovação" : "Planos de aluguel",
            emptyText: "Nenhum plano de aluguel está disponível no momento.",
            type: activeSubscription ? "renewal" : "initial",
            footer: [
                formatActiveSubscriptionInfo(activeSubscription, prefix),
                ...(plans.length && !activeSubscription ? [
                    message.platform === "whatsapp"
                        ? "Etapa 2 — para contratar no grupo/servidor, depois de adicionar o bot, use:"
                        : "Etapa 2 — para contratar no grupo/servidor, escolha um plano pelos botões ou use:",
                    commandLine(`${prefix}alugar contratar <ID>`)
                ] : [])
            ].filter(Boolean).join("\n")
        });
    }
};
