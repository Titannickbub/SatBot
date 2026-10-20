const chatControl = require("./chatControl");
const { isOwner } = require("./owners");

function getAdapter(message) {
    return (message.platforms || []).find(platform => platform.name === message.platform) ||
        global.platformRegistry?.[message.platform];
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

async function executeStateCommand(message, isOpen, description) {
    if (message.isPrivate) {
        return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou canais compatíveis." });
    }
    if (message.platform === "whatsapp" && message.isCommunity) {
        return message.reply({ text: "❌ A abertura e o fechamento não estão disponíveis em comunidades do WhatsApp." });
    }
    if (!await checkUserCanManage(message)) {
        return message.reply({ text: "❌ Apenas administradores ou pessoas com permissão para gerenciar o chat podem usar este comando." });
    }
    if (!await checkBotCanManage(message)) {
        return message.reply({ text: "❌ O bot não tem permissão para alterar as configurações deste chat." });
    }

    const args = message.args || [];
    if (["help", "ajuda"].includes(String(args[0] || "").toLowerCase())) {
        return message.reply({ text: description.replaceAll("{prefix}", message.prefix || "!") });
    }
    if (args.length > 1) {
        return message.reply({ text: `❌ Informe apenas uma duração (ex.: 2h) ou um horário (ex.: 12:00).` });
    }

    try {
        const result = await chatControl.setChatState(message, isOpen, args[0] || null);
        const action = isOpen ? "aberto" : "fechado";
        if (!result.changed) {
            const unchanged = `ℹ️ O chat já estava ${action}.`;
            return message.reply({
                text: result.restoreAt
                    ? `${unchanged} A reversão está programada para ${new Date(result.restoreAt).toLocaleString("pt-BR")}.`
                    : unchanged
            });
        }
        return message.reply({
            text: result.restoreAt
                ? `✅ Chat ${action}. A alteração será revertida em ${new Date(result.restoreAt).toLocaleString("pt-BR")}.`
                : `✅ Chat ${action}.`
        });
    } catch (error) {
        console.error(`[CHAT CONTROL] Falha no comando ${message.command}:`, error);
        return message.reply({ text: `❌ Não foi possível alterar o estado do chat: ${error.message}` });
    }
}

module.exports = {
    executeStateCommand
};
