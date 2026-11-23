const fs = require("fs");
const suggestionService = require("../../functions/suggestionService");
const send = require("../../functions/send");
const { isOwner } = require("../../functions/owners");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const PAGE_SIZE = 10;

function isSuperUser(message) {
    return Boolean(message.sender?.isOwner || isOwner(message));
}

function makeInteractionMessage(interaction) {
    const componentMessage = interaction?.[Symbol.for("satbot.componentMessageContext")];
    if (componentMessage?.platform && componentMessage.userId) return componentMessage;
    return null;
}

function actionRows(platform, id, status) {
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
                .setCustomId(`bugssu:${button.action}:${id}`)
                .setLabel(button.label)
                .setStyle(button.style))
        )];
    }
    if (platform === "telegram") {
        return [buttons.map(button => ({
            text: button.label,
            callback_data: `bugssu:${button.action}:${id}`
        }))];
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

function menuText(message) {
    const platform = suggestionService.assertPlatform(message.platform);
    const settings = suggestionService.getSettings();
    const channel = settings.channels[platform];
    const prefix = message.prefix || "!";
    return [
        "⚙️ Gerenciamento de sugestões (SU)",
        `Recebimento: ${settings.enabled ? "ativado" : "desativado"}`,
        `Canal: ${channel ? `${channel.name} (${channel.chatId})${channel.threadId ? ` · tópico ${channel.threadId}` : ""}` : "não configurado"}`,
        "",
        "Use os botões abaixo ou estes comandos:",
        `${prefix}bugssu listar [página] — ver e moderar sugestões`,
        `${prefix}bugssu ativar | desativar — controlar o recebimento`,
        `${prefix}bugssu canal — usar este chat/tópico como canal`,
        `${prefix}bugssu canal off — remover o canal configurado`,
        `${prefix}bugssu aceitar|agradecer|recusar|deletar <ID> — moderar`
    ].join("\n");
}

function menuPayload(message) {
    const text = menuText(message);
    const components = menuRows(message.platform);
    return message.platform === "discord"
        ? { text, components }
        : {
            text,
            ...(message.platform === "telegram"
                ? { reply_markup: { inline_keyboard: components } }
                : {})
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
        ? { components: payload.components || [] }
        : { reply_markup: payload.reply_markup || { inline_keyboard: [] } };
    return send.text(
        message.platform,
        message.chatId,
        message.threadId,
        payload.text || "",
        options
    );
}

function formatSuggestion(suggestion) {
    const date = new Date(suggestion.createdAt).toLocaleString("pt-BR");
    const status = {
        pending: "Pendente",
        accepted: "Aceita",
        thanked: "Agradecimento enviado",
        rejected: "Recusada"
    }[suggestion.status] || suggestion.status;
    return [
        `📨 Sugestão #${suggestion.id} · ${status} · ${suggestion.platform}`,
        `Usuário: ${suggestion.name}${suggestion.username ? ` (@${suggestion.username})` : ""} · ID: ${suggestion.userId}`,
        `Chat: ${suggestion.chatName} · ID: ${suggestion.chatId}${suggestion.threadId ? ` · Tópico: ${suggestion.threadId}` : ""}`,
        `Data: ${date}`,
        suggestion.text
            ? (suggestion.text.length > 1200 ? `${suggestion.text.slice(0, 1200)}… [texto abreviado]` : suggestion.text)
            : "Sugestão enviada com imagem.",
        suggestion.media ? `📷 Imagem: ${suggestion.media.fileName}` : ""
    ].filter(Boolean).join("\n");
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
                ...suggestions.map(item => `${formatSuggestion(item)}\nAções: ${message.prefix}bugssu aceitar|agradecer|recusar|deletar ${item.id}`)
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
        const payload = message.platform === "discord"
            ? { text: formatSuggestion(suggestion), components }
            : {
                text: formatSuggestion(suggestion),
                reply_markup: { inline_keyboard: components }
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

    const [, section, actionOrId, suggestionId] = String(interaction.customId || interaction.callbackQuery?.data || "").split(":");
    try {
        if (section === "menu") {
            if (actionOrId === "list") {
                if (interaction.callbackQuery) {
                    await interaction.answerCbQuery("Enviando as sugestões neste chat.");
                } else {
                    await interaction.reply({ content: "Enviando as sugestões neste canal.", ephemeral: true });
                }
                try {
                    await showSuggestions(message);
                } catch (error) {
                    console.error("[BUGSSU] Não foi possível enviar a lista de sugestões:", error.message || error);
                    try {
                        await send.text(
                            message.platform,
                            message.chatId,
                            message.threadId,
                            "❌ Não foi possível carregar as sugestões. Consulte os logs do bot."
                        );
                    } catch (notificationError) {
                        console.error("[BUGSSU] Não foi possível avisar sobre a falha ao listar sugestões:", notificationError.message || notificationError);
                    }
                }
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
            if (interaction.callbackQuery) {
                await interaction.editMessageText(payload.text, payload.reply_markup);
            } else {
                await interaction.update({ content: payload.text, components: payload.components });
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
