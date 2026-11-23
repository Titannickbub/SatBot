const chatControl = require("./chatControl");
const { isOwner } = require("./owners");

const TEMPORARY_BUTTON_DURATIONS = [
    { value: "30m", label: "30 minutos", shortLabel: "30 min" },
    { value: "1h", label: "1 hora", shortLabel: "1 h" },
    { value: "2h", label: "2 horas", shortLabel: "2 h" },
    { value: "6h", label: "6 horas", shortLabel: "6 h" },
    { value: "12h", label: "12 horas", shortLabel: "12 h" },
    { value: "1d", label: "24 horas", shortLabel: "24 h" }
];

function getCommandName(isOpen) {
    return isOpen ? "abrirchat" : "fecharchat";
}

function getAdapter(message) {
    return (message.platforms || []).find(platform => platform.name === message.platform) ||
        global.platformRegistry?.[message.platform];
}

function getStateControls(message, isOpen) {
    const temporaryCommand = getCommandName(isOpen);
    if (message.platform === "telegram") {
        const actionButtons = [
            { text: "🔓 Abrir chat", callback_data: "abrirchat:open" },
            { text: "🔒 Fechar chat", callback_data: "fecharchat:close" }
        ];
        const temporaryButtons = TEMPORARY_BUTTON_DURATIONS.map(duration => ({
            text: `${isOpen ? "🔓 Abrir" : "🔒 Fechar"} ${duration.shortLabel}`,
            callback_data: `${temporaryCommand}:temporary:${duration.value}`
        }));
        const inline_keyboard = [
            actionButtons,
            ...temporaryButtons.reduce((rows, button, index) => {
                if (index % 2 === 0) rows.push([]);
                rows[rows.length - 1].push(button);
                return rows;
            }, [])
        ];
        return { reply_markup: { inline_keyboard } };
    }

    if (message.platform === "discord") {
        const {
            ActionRowBuilder,
            ButtonBuilder,
            ButtonStyle,
            StringSelectMenuBuilder
        } = require("discord.js");
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("abrirchat:open")
                .setLabel("Abrir chat")
                .setEmoji("🔓")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("fecharchat:close")
                .setLabel("Fechar chat")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger)
        );
        const temporaryRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${temporaryCommand}:temporary`)
                .setPlaceholder(isOpen ? "Abrir temporariamente..." : "Fechar temporariamente...")
                .addOptions(TEMPORARY_BUTTON_DURATIONS.map(duration => ({
                    label: duration.label,
                    description: `${isOpen ? "Abrir" : "Fechar"} o chat por ${duration.label.toLowerCase()}`,
                    value: duration.value
                })))
        );
        return { components: [actionRow, temporaryRow] };
    }

    return {};
}

async function checkUserCanManage(message) {
    if (message.sender?.isOwner || isOwner(message)) return true;
    const adapter = getAdapter(message);
    if (adapter?.checkUserPermission) {
        return adapter.checkUserPermission(message.chatId, message.userId, "manageChat");
    }
    return Boolean(message.sender?.isAdmin || message.sender?.canManageChats);
}

async function checkBotCanManage(message) {
    const adapter = getAdapter(message);
    if (!adapter?.checkBotPermission) return false;
    return adapter.checkBotPermission(message.chatId, "manageChat");
}

async function getAccessError(message) {
    if (message.isPrivate) {
        return "❌ Este comando só pode ser usado em grupos ou canais compatíveis.";
    }
    if (message.platform === "whatsapp" && message.isCommunity) {
        return "❌ A abertura e o fechamento não estão disponíveis em comunidades do WhatsApp.";
    }
    if (!await checkUserCanManage(message)) {
        return "❌ Apenas administradores ou pessoas com permissão para gerenciar o chat podem usar este comando.";
    }
    if (!await checkBotCanManage(message)) {
        return "❌ O bot não tem permissão para alterar as configurações deste chat.";
    }
    return null;
}

function getResultText(result, isOpen) {
    const action = isOpen ? "aberto" : "fechado";
    if (!result.changed) {
        const unchanged = `ℹ️ O chat já estava ${action}.`;
        return result.restoreAt
            ? `${unchanged} A reversão está programada para ${new Date(result.restoreAt).toLocaleString("pt-BR")}.`
            : unchanged;
    }
    return result.restoreAt
        ? `✅ Chat ${action}. A alteração será revertida em ${new Date(result.restoreAt).toLocaleString("pt-BR")}.`
        : `✅ Chat ${action}.`;
}

function getStateReply(message, result, isOpen) {
    const text = getResultText(result, isOpen);
    const controls = getStateControls(message, isOpen);
    if (message.platform === "discord") {
        const state = isOpen ? "aberto" : "fechado";
        return message.reply({
            embed: {
                color: isOpen ? 0x2ECC71 : 0xE74C3C,
                title: result.changed ? `Chat ${state}` : `Chat já estava ${state}`,
                description: text
            },
            ...controls
        });
    }
    return message.reply({ text, ...controls });
}

async function executeStateCommand(message, isOpen, description) {
    const accessError = await getAccessError(message);
    if (accessError) return message.reply({ text: accessError });

    const args = message.args || [];
    if (["help", "ajuda"].includes(String(args[0] || "").toLowerCase())) {
        return message.reply({ text: description.replaceAll("{prefix}", message.prefix || "!") });
    }
    if (args.length > 1) {
        return message.reply({ text: `❌ Informe apenas uma duração (ex.: 2h) ou um horário (ex.: 12:00).` });
    }

    try {
        const result = await chatControl.setChatState(message, isOpen, args[0] || null);
        return getStateReply(message, result, isOpen);
    } catch (error) {
        console.error(`[CHAT CONTROL] Falha no comando ${message.command}:`, error);
        return message.reply({ text: `❌ Não foi possível alterar o estado do chat: ${error.message}` });
    }
}

async function handleStateInteraction(interaction) {
    const componentId = interaction?.customId || interaction?.callbackQuery?.data;
    if (typeof componentId !== "string") return false;

    const [commandName, action, callbackDuration] = componentId.split(":");
    if (!["abrirchat", "fecharchat"].includes(commandName) ||
        !["open", "close", "temporary"].includes(action)) {
        return false;
    }

    const message = interaction[Symbol.for("satbot.componentMessageContext")];
    if (!message) return false;

    const isOpen = action === "open" ||
        (action === "temporary" && commandName === "abrirchat");
    const duration = action === "temporary"
        ? (callbackDuration || interaction.values?.[0])
        : null;
    if (action === "temporary" &&
        !TEMPORARY_BUTTON_DURATIONS.some(option => option.value === duration)) {
        await message.reply({ text: "❌ Selecione uma duração válida para a ação temporária." });
        return true;
    }

    const accessError = await getAccessError(message);
    if (accessError) {
        await message.reply({ text: accessError });
        return true;
    }

    try {
        const result = await chatControl.setChatState(message, isOpen, duration);
        await message.reply({ text: getResultText(result, isOpen) });
    } catch (error) {
        console.error(`[CHAT CONTROL] Falha na interação ${componentId}:`, error);
        await message.reply({ text: `❌ Não foi possível alterar o estado do chat: ${error.message}` });
    }
    return true;
}

module.exports = {
    executeStateCommand,
    handleStateInteraction
};
