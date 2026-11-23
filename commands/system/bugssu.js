const fs = require("fs");
const suggestionService = require("../../functions/suggestionService");
const send = require("../../functions/send");
const { isOwner } = require("../../functions/owners");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const PAGE_SIZE = 10;
const pageMediaMessages = new Map();

function isSuperUser(message) {
    return Boolean(message.sender?.isOwner || isOwner(message));
}

function makeInteractionMessage(interaction) {
    const componentMessage = interaction?.[Symbol.for("satbot.componentMessageContext")];
    if (componentMessage?.platform && componentMessage.userId) return componentMessage;
    return null;
}

function actionRows(platform, id, status, page = null) {
    const buttons = status === "pending" ? [
        { label: "Aceitar", action: "accept", style: ButtonStyle.Success },
        { label: "Agradecer", action: "thank", style: ButtonStyle.Primary },
        { label: "Recusar", action: "reject", style: ButtonStyle.Secondary },
        { label: "Deletar", action: "delete", style: ButtonStyle.Danger }
    ] : [
        { label: "Deletar", action: "delete", style: ButtonStyle.Danger }
    ];
    if (platform === "discord") {
        return [new ActionRowBuilder().addComponents(
            ...buttons.map(button => new ButtonBuilder()
                .setCustomId(page === null
                    ? `bugssu:${button.action}:${id}`
                    : `bugssu:pageaction:${button.action}:${id}:${page}`)
                .setLabel(button.label)
                .setStyle(button.style))
        )];
    }
    if (platform === "telegram") {
        return [buttons.map(button => ({
            text: button.label,
            callback_data: page === null
                ? `bugssu:${button.action}:${id}`
                : `bugssu:pageaction:${button.action}:${id}:${page}`
        }))];
    }
    return [];
}

function pageNavigationRows(platform, page, totalPages) {
    if (platform === "discord") {
        return [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`bugssu:page:previous:${Math.max(1, page - 1)}`)
                .setLabel("⬅️ Anterior")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId(`bugssu:page:next:${Math.min(totalPages, page + 1)}`)
                .setLabel("Próxima ➡️")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages),
            new ButtonBuilder()
                .setCustomId("bugssu:page:back")
                .setLabel("Menu")
                .setStyle(ButtonStyle.Primary)
        )];
    }
    if (platform === "telegram") {
        const buttons = [];
        if (page > 1) {
            buttons.push({
                text: "⬅️ Anterior",
                callback_data: `bugssu:page:${page - 1}`
            });
        }
        if (page < totalPages) {
            buttons.push({
                text: "Próxima ➡️",
                callback_data: `bugssu:page:${page + 1}`
            });
        }
        return [
            ...(buttons.length ? [buttons] : []),
            [{ text: "↩️ Menu", callback_data: "bugssu:page:back" }]
        ];
    }
    return [];
}

function menuRows(platform) {
    const buttons = [
        { label: "Ver sugestões", action: "list", style: ButtonStyle.Primary },
        { label: "Ativar", action: "enable", style: ButtonStyle.Success },
        { label: "Desativar", action: "disable", style: ButtonStyle.Danger },
        { label: "Configurar canal aqui", action: "setchannel", style: ButtonStyle.Secondary },
        { label: "Remover canal", action: "clearchannel", style: ButtonStyle.Secondary }
    ];
    if (platform === "discord") {
        return [new ActionRowBuilder().addComponents(
            ...buttons.map(button => new ButtonBuilder()
                .setCustomId(`bugssu:menu:${button.action}`)
                .setLabel(button.label)
                .setStyle(button.style))
        )];
    }
    if (platform === "telegram") {
        return [buttons.map(button => ({
            text: button.label,
            callback_data: `bugssu:menu:${button.action}`
        }))];
    }
    return [];
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function menuPayload(message) {
    const platform = suggestionService.assertPlatform(message.platform);
    const settings = suggestionService.getSettings();
    const channel = settings.channels[platform];
    const prefix = message.prefix || "!";
    const channelName = channel
        ? `${channel.name}${channel.threadId ? ` · tópico ${channel.threadId}` : ""}`
        : "Não configurado";
    const commands = [
        `${prefix}bugssu listar [página] — ver/moderar sugestões`,
        `${prefix}bugssu ativar | desativar — controlar recebimento`,
        `${prefix}bugssu canal — usar este chat/tópico como destino`,
        `${prefix}bugssu canal off — remover o destino`,
        `${prefix}bugssu aceitar|agradecer|recusar|deletar <ID>`
    ];
    const components = menuRows(message.platform);
    if (platform === "discord") {
        return {
            embed: {
                color: settings.enabled ? 0x57F287 : 0xF0B232,
                title: "🛠️ Central de sugestões",
                description: "Consulte e modere reports, além de configurar o recebimento.",
                fields: [
                    {
                        name: "📥 Recebimento",
                        value: settings.enabled ? "✅ Ativado" : "🔕 Desativado",
                        inline: true
                    },
                    {
                        name: "📣 Canal de encaminhamento",
                        value: channel
                            ? `${channelName}\nID: \`${channel.chatId}\``
                            : "Não configurado",
                        inline: true
                    },
                    {
                        name: "⌨️ Comandos",
                        value: commands.map(command => `\`${command}\``).join("\n"),
                        inline: false
                    }
                ],
                footer: { text: "A configuração de canal vale para a plataforma deste chat." }
            },
            components
        };
    }

    if (platform === "telegram") {
        return {
            text: [
                "<b>🛠️ Central de sugestões</b>",
                "<i>Consulte e modere reports e configure o recebimento.</i>",
                "",
                `<b>📥 Recebimento:</b> ${settings.enabled ? "✅ Ativado" : "🔕 Desativado"}`,
                `<b>📣 Canal:</b> ${channel
                    ? `${escapeHtml(channelName)} <code>${escapeHtml(channel.chatId)}</code>`
                    : "Não configurado"}`,
                "",
                "<b>⌨️ Comandos</b>",
                ...commands.map(command => `<code>${escapeHtml(command)}</code>`)
            ].join("\n"),
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: components }
        };
    }

    return {
        text: [
            "*🛠️ CENTRAL DE SUGESTÕES*",
            "Consulte e modere reports ou configure o recebimento.",
            "",
            `*📥 Recebimento:* ${settings.enabled ? "✅ Ativado" : "🔕 Desativado"}`,
            `*📣 Canal:* ${channel ? `${channelName} (${channel.chatId})` : "Não configurado"}`,
            "",
            "*⌨️ COMANDOS*",
            ...commands.map(command => `• ${command}`)
        ].join("\n")
    };
}

async function showMenu(message) {
    return message.reply(menuPayload(message));
}

async function sendSuggestionMessage(message, payload) {
    if (!message.isComponentInteraction) return message.reply(payload);
    if (payload.image) {
        return send.image(
            message.platform,
            message.chatId,
            message.threadId,
            payload.image,
            payload.caption
        );
    }
    const options = message.platform === "discord"
        ? {
            ...(payload.embed ? { embed: payload.embed } : {}),
            ...(payload.components?.length ? { components: payload.components } : {})
        }
        : {
            ...(payload.parse_mode ? { parse_mode: payload.parse_mode } : {}),
            ...(payload.reply_markup ? { reply_markup: payload.reply_markup } : {})
        };
    return send.text(
        message.platform,
        message.chatId,
        message.threadId,
        payload.text || "",
        options
    );
}

function formatSuggestion(suggestion, platform) {
    const date = new Date(suggestion.createdAt).toLocaleString("pt-BR");
    const status = {
        pending: "Pendente",
        accepted: "Aceita",
        thanked: "Agradecimento enviado",
        rejected: "Recusada"
    }[suggestion.status] || suggestion.status;
    const text = suggestion.text
        ? (suggestion.text.length > 1200 ? `${suggestion.text.slice(0, 1200)}… [texto abreviado]` : suggestion.text)
        : "Sugestão enviada com imagem.";
    const author = `${suggestion.name}${suggestion.username ? ` (@${suggestion.username})` : ""}`;
    const origin = `${suggestion.chatName}${suggestion.threadId ? ` · tópico ${suggestion.threadId}` : ""}`;
    if (platform === "discord") {
        return {
            embed: {
                color: suggestion.status === "pending" ? 0x5865F2 : 0x57F287,
                title: `📨 Sugestão #${suggestion.id}`,
                description: text,
                fields: [
                    { name: "📌 Status", value: status, inline: true },
                    { name: "🌐 Plataforma", value: suggestion.platform, inline: true },
                    { name: "👤 Autor", value: `${author}\nID: ${suggestion.userId}`, inline: false },
                    { name: "💬 Origem", value: `${origin}\nID: ${suggestion.chatId}`, inline: false },
                    { name: "🕒 Enviada em", value: date, inline: true },
                    ...(suggestion.media ? [{
                        name: "🖼️ Anexo",
                        value: suggestion.media.fileName,
                        inline: true
                    }] : [])
                ],
                footer: { text: "Moderação de sugestões · SatBot" }
            }
        };
    }
    if (platform === "telegram") {
        return {
            text: [
                `<b>📨 Sugestão #${escapeHtml(suggestion.id)}</b>`,
                `<b>📌 Status:</b> ${escapeHtml(status)} · <b>Plataforma:</b> ${escapeHtml(suggestion.platform)}`,
                `<b>👤 Autor:</b> ${escapeHtml(author)} · <code>${escapeHtml(suggestion.userId)}</code>`,
                `<b>💬 Origem:</b> ${escapeHtml(origin)} · <code>${escapeHtml(suggestion.chatId)}</code>`,
                `<b>🕒 Data:</b> ${escapeHtml(date)}`,
                `<blockquote>${escapeHtml(text)}</blockquote>`,
                suggestion.media ? `<b>🖼️ Anexo:</b> ${escapeHtml(suggestion.media.fileName)}` : ""
            ].filter(Boolean).join("\n"),
            parse_mode: "HTML"
        };
    }
    return {
        text: [
            `*📨 SUGESTÃO #${suggestion.id}*`,
            `*📌 Status:* ${status} · *Plataforma:* ${suggestion.platform}`,
            `*👤 Autor:* ${author} (${suggestion.userId})`,
            `*💬 Origem:* ${origin} (${suggestion.chatId})`,
            `*🕒 Data:* ${date}`,
            `*📝 Texto:*\n${text}`,
            suggestion.media ? `*🖼️ Anexo:* ${suggestion.media.fileName}` : ""
        ].filter(Boolean).join("\n")
    };
}

function componentMessageId(interaction) {
    const messageId = interaction.callbackQuery?.message?.message_id || interaction.message?.id;
    return messageId ? String(messageId) : "";
}

function pageMediaKey(interaction, message) {
    const messageId = componentMessageId(interaction);
    return messageId ? `${message.platform}:${message.chatId}:${messageId}` : "";
}

async function removePageMedia(interaction, message) {
    const key = pageMediaKey(interaction, message);
    const mediaMessageId = key ? pageMediaMessages.get(key) : null;
    if (!mediaMessageId) return;
    try {
        if (message.platform === "telegram") {
            const telegram = global.telegramBot?.telegram;
            if (!telegram?.deleteMessage) throw new Error("Cliente Telegram indisponível para remover a imagem anterior.");
            await telegram.deleteMessage(message.chatId, Number(mediaMessageId));
        } else {
            const channel = await global.discordClient?.channels?.fetch(message.threadId || message.chatId);
            if (!channel?.messages?.delete) throw new Error("Canal Discord indisponível para remover a imagem anterior.");
            await channel.messages.delete(mediaMessageId);
        }
    } catch (error) {
        console.warn(`[BUGSSU] Não foi possível remover a imagem da página anterior:`, error.message || error);
    } finally {
        pageMediaMessages.delete(key);
    }
}

function suggestionPagePayload(message, suggestion, page, totalPages) {
    const components = [
        ...actionRows(message.platform, suggestion.id, suggestion.status, page),
        ...pageNavigationRows(message.platform, page, totalPages)
    ];
    const formatted = formatSuggestion(suggestion, message.platform);
    if (message.platform === "discord") {
        formatted.embed.footer = {
            text: `Página ${page}/${totalPages} · Moderação de sugestões · SatBot`
        };
        return { ...formatted, components };
    }
    return {
        ...formatted,
        text: `${formatted.text}\n\n<b>📄 Página ${page}/${totalPages}</b>`,
        reply_markup: { inline_keyboard: components }
    };
}

async function updateComponentMessage(interaction, payload) {
    if (interaction.callbackQuery) {
        await interaction.editMessageText(payload.text, {
            parse_mode: payload.parse_mode,
            reply_markup: payload.reply_markup
        });
        return;
    }
    await interaction.update({
        embeds: [new EmbedBuilder(payload.embed)],
        components: payload.components
    });
}

async function showSuggestionPage(interaction, message, requestedPage) {
    const suggestions = suggestionService.list();
    const totalPages = suggestions.length;
    if (!totalPages) {
        const payload = message.platform === "discord"
            ? {
                embed: {
                    color: 0x5865F2,
                    title: "📭 Nenhuma sugestão",
                    description: "Ainda não há sugestões registradas.",
                    footer: { text: "Use o botão Menu para voltar à administração." }
                },
                components: pageNavigationRows(message.platform, 1, 1)
            }
            : {
                text: "<b>📭 Nenhuma sugestão</b>\nAinda não há sugestões registradas.",
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: pageNavigationRows(message.platform, 1, 1) }
            };
        await removePageMedia(interaction, message);
        await updateComponentMessage(interaction, payload);
        return;
    }

    const page = Math.max(1, Math.min(totalPages, Number(requestedPage) || 1));
    const suggestion = suggestions[page - 1];
    const payload = suggestionPagePayload(message, suggestion, page, totalPages);
    await removePageMedia(interaction, message);
    await updateComponentMessage(interaction, payload);

    if (suggestion.media) {
        const media = suggestionService.getMedia(suggestion.id);
        if (media) {
            try {
                const mediaMessageId = await send.image(
                    message.platform,
                    message.chatId,
                    message.threadId,
                    fs.readFileSync(media.filePath),
                    `Imagem da sugestão #${suggestion.id}`
                );
                const key = pageMediaKey(interaction, message);
                if (key && mediaMessageId) pageMediaMessages.set(key, String(mediaMessageId));
            } catch (error) {
                console.error(`[BUGSSU] Não foi possível enviar a imagem da sugestão ${suggestion.id}:`, error.message || error);
                try {
                    await send.text(
                        message.platform,
                        message.chatId,
                        message.threadId,
                        "⚠️ A sugestão foi exibida, mas sua imagem não pôde ser carregada."
                    );
                } catch (notificationError) {
                    console.error("[BUGSSU] Não foi possível avisar sobre a falha ao enviar a imagem:", notificationError.message || notificationError);
                }
            }
        }
    }
}

async function showSuggestions(message, requestedPage = 1) {
    const allSuggestions = suggestionService.list();
    const totalPages = Math.max(1, Math.ceil(allSuggestions.length / PAGE_SIZE));
    if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > totalPages) {
        throw new Error(`Informe uma página entre 1 e ${totalPages}.`);
    }
    const suggestions = allSuggestions.slice(
        (requestedPage - 1) * PAGE_SIZE,
        requestedPage * PAGE_SIZE
    );
    if (!suggestions.length) {
        return sendSuggestionMessage(message, { text: "📭 Ainda não há sugestões registradas." });
    }
    const pageInfo = totalPages > 1
        ? `\nPágina ${requestedPage}/${totalPages}. Para continuar: ${message.prefix || "!"}bugssu listar <página>.`
        : "";
    if (message.platform === "whatsapp") {
        await sendSuggestionMessage(message, {
            text: [
                `📨 Sugestões (${suggestions.length} nesta página):`,
                ...suggestions.map(item => `${formatSuggestion(item, "whatsapp").text}\nAções: ${message.prefix}bugssu aceitar|agradecer|recusar|deletar ${item.id}`)
            ].join("\n\n") + pageInfo
        });
        for (const suggestion of suggestions) {
            const media = suggestionService.getMedia(suggestion.id);
            if (media) {
                await sendSuggestionMessage(message, {
                    image: fs.readFileSync(media.filePath),
                    caption: `Imagem da sugestão #${suggestion.id}`
                });
            }
        }
        if (pageInfo) await message.reply({ text: pageInfo.trim() });
        return;
    }
    for (const suggestion of suggestions) {
        const components = actionRows(message.platform, suggestion.id, suggestion.status);
        const payload = {
            ...formatSuggestion(suggestion, message.platform),
            ...(message.platform === "discord"
                ? { components }
                : { reply_markup: { inline_keyboard: components } })
        };
        await sendSuggestionMessage(message, payload);
        const media = suggestionService.getMedia(suggestion.id);
        if (media) {
            await sendSuggestionMessage(message, {
                image: fs.readFileSync(media.filePath),
                caption: `Imagem da sugestão #${suggestion.id}`
            });
        }
    }
}

async function moderate(message, action, id) {
    const suggestion = suggestionService.get(id);
    if (!suggestion) throw new Error(`Sugestão ${id} não encontrada.`);
    if (action === "delete") {
        suggestionService.remove(id);
        return `🗑️ Sugestão #${id} apagada sem notificar o autor.`;
    }
    const status = {
        accept: "accepted",
        aceitar: "accepted",
        approve: "accepted",
        thank: "thanked",
        agradecer: "thanked",
        thanks: "thanked",
        reject: "rejected",
        recusar: "rejected"
    }[action];
    if (!status) throw new Error("Ação inválida. Use aceitar, agradecer, recusar ou deletar.");
    if (suggestion.status === status) {
        return `ℹ️ A sugestão #${id} já está marcada como ${status}; nenhuma nova mensagem foi enviada.`;
    }
    suggestionService.setStatus(id, status, message.userId);
    try {
        await suggestionService.notifyAuthor(suggestion, status);
        return `✅ Ação aplicada à sugestão #${id}; o autor foi avisado no chat de origem.`;
    } catch (error) {
        console.error(`[BUGSSU] Não foi possível avisar o autor da sugestão ${id}:`, error.message || error);
        return `⚠️ A ação foi salva para a sugestão #${id}, mas não foi possível avisar o autor: ${error.message || "falha no envio"}`;
    }
}

async function handleInteraction(interaction) {
    const message = makeInteractionMessage(interaction);
    if (!message) return false;
    if (!isSuperUser(message)) {
        if (interaction.callbackQuery) {
            await interaction.answerCbQuery("Apenas o superusuário pode administrar sugestões.", { show_alert: true });
        } else {
            await interaction.reply({
                content: "❌ Apenas o superusuário pode administrar sugestões.",
                ephemeral: true
            });
        }
        return true;
    }

    const [, section, actionOrId, suggestionId, pageValue] = String(interaction.customId || interaction.callbackQuery?.data || "").split(":");
    try {
        if (section === "menu") {
            if (actionOrId === "list") {
                await showSuggestionPage(interaction, message, 1);
                return true;
            }

            const platform = suggestionService.assertPlatform(message.platform);
            if (actionOrId === "enable" || actionOrId === "disable") {
                suggestionService.updateSettings({ enabled: actionOrId === "enable" });
            } else if (actionOrId === "setchannel") {
                if (message.isPrivate) {
                    throw new Error("Configure o canal no chat ou tópico que receberá as sugestões.");
                }
                suggestionService.updateSettings({
                    platform,
                    channel: {
                        chatId: message.chatId,
                        threadId: message.threadId,
                        name: message.groupName || message.raw?.chat?.title ||
                            message.raw?.guild?.name || message.raw?.channel?.name || message.chatId
                    }
                });
            } else if (actionOrId === "clearchannel") {
                suggestionService.updateSettings({ platform, channel: null });
            } else {
                throw new Error("Ação do menu inválida.");
            }

            const payload = menuPayload(message);
            await removePageMedia(interaction, message);
            await updateComponentMessage(interaction, payload);
            return true;
        }

        if (section === "page") {
            if (actionOrId === "back") {
                await removePageMedia(interaction, message);
                await updateComponentMessage(interaction, menuPayload(message));
            } else if (actionOrId === "previous" || actionOrId === "next") {
                await showSuggestionPage(interaction, message, Number(suggestionId));
            } else {
                await showSuggestionPage(interaction, message, Number(actionOrId));
            }
            return true;
        }

        if (section === "pageaction") {
            const result = await moderate(message, actionOrId, suggestionId);
            await showSuggestionPage(interaction, message, Number(pageValue));
            if (interaction.callbackQuery) {
                await interaction.answerCbQuery(result.slice(0, 190), { show_alert: true });
            } else {
                await interaction.followUp({ content: result, ephemeral: true });
            }
            return true;
        }

        const result = await moderate(message, section, actionOrId || suggestionId);
        if (interaction.callbackQuery) {
            await interaction.answerCbQuery(result.slice(0, 190), { show_alert: true });
        } else {
            await interaction.reply({ content: result, ephemeral: true });
        }
    } catch (error) {
        if (interaction.callbackQuery) {
            await interaction.answerCbQuery(error.message, { show_alert: true });
        } else if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: `❌ ${error.message}`, ephemeral: true });
        } else {
            await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
        }
    }
    return true;
}

module.exports = {
    name: "bugssu",
    aliases: ["sugestoessu", "reportsu"],
    category: "system/configurações",
    description: "Consulte, modere e configure o recebimento de sugestões.",
    usage: "{prefix}bugssu [menu|listar [página]|ativar|desativar|canal|aceitar|agradecer|recusar|deletar]",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },
    handleInteraction,

    async execute(message) {
        if (!isSuperUser(message)) {
            return message.reply({ text: "❌ Somente o superusuário pode usar este comando." });
        }
        const args = message.args || [];
        const action = String(args[0] || "menu").toLowerCase();
        const prefix = message.prefix || "!";

        try {
            const platform = suggestionService.assertPlatform(message.platform);
            if (["menu", "ajuda", "help"].includes(action)) {
                return await showMenu(message);
            }
            if (["status", "config"].includes(action)) {
                const settings = suggestionService.getSettings();
                const channel = settings.channels[platform];
                return message.reply({
                    text: [
                        `Sugestões: ${settings.enabled ? "ativadas" : "desativadas"}`,
                        `Canal: ${channel ? `${channel.name} (${channel.chatId})${channel.threadId ? ` · tópico ${channel.threadId}` : ""}` : "não configurado"}`,
                        `Use ${prefix}bugssu ativar ou ${prefix}bugssu desativar.`,
                        `Use ${prefix}bugssu canal neste chat para encaminhar sugestões para cá; ${prefix}bugssu canal off para remover.`
                    ].join("\n")
                });
            }
            if (["ativar", "on", "desativar", "off"].includes(action)) {
                const enabled = ["ativar", "on"].includes(action);
                const settings = suggestionService.updateSettings({ enabled });
                return message.reply({
                    text: `✅ O recebimento de sugestões foi ${settings.enabled ? "ativado" : "desativado"}.`
                });
            }
            if (action === "canal") {
                const clear = ["off", "limpar", "remover"].includes(String(args[1] || "").toLowerCase());
                if (!clear && message.isPrivate) {
                    return message.reply({ text: "❌ Configure o canal no chat ou tópico que receberá as sugestões." });
                }
                const channel = clear
                    ? null
                    : {
                        chatId: message.chatId,
                        threadId: message.threadId,
                        name: message.groupName || message.raw?.chat?.title ||
                            message.raw?.guild?.name || message.raw?.channel?.name || message.chatId
                    };
                const settings = suggestionService.updateSettings({ platform, channel });
                const configured = settings.channels[platform];
                return message.reply({
                    text: configured
                        ? `✅ As sugestões desta plataforma serão encaminhadas para ${configured.name}${configured.threadId ? ` (tópico ${configured.threadId})` : ""}.`
                        : "✅ Canal de sugestões removido."
                });
            }
            if (["listar", "lista", "list"].includes(action)) {
                const pageValue = args[1] ? Number(args[1]) : 1;
                return await showSuggestions(message, pageValue);
            }
            const id = String(args[1] || "");
            if (!id) {
                return message.reply({
                    text: `Uso:\n${prefix}bugssu listar [página]\n${prefix}bugssu aceitar|agradecer|recusar|deletar <ID>\n${prefix}bugssu ativar|desativar\n${prefix}bugssu canal [off]`
                });
            }
            return message.reply({ text: await moderate(message, action, id) });
        } catch (error) {
            return message.reply({ text: `❌ ${error.message || "Não foi possível concluir a ação."}` });
        }
    }
};
