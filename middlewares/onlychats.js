const { getOnlyChatsConfig, isChatAllowedByOnlyChats, isOnlyChatsContextWhitelisted } = require("../functions/config");
const { isOwner } = require("../functions/owners");
const rentalHelper = require("../functions/rentalHelper");

const notifiedRentalOnlyChats = new Set();

async function replyOnlyChatsOnce(message, text) {
    const chatId = rentalHelper.getChatId(message);
    if (!chatId) return;
    const key = `${message.platform}:${chatId}`;
    if (notifiedRentalOnlyChats.has(key)) return;
    try {
        await rentalHelper.sendGroupNotice(
            message.platform,
            chatId,
            text,
            message.threadId || message.topicId || null
        );
        notifiedRentalOnlyChats.add(key);
        if (notifiedRentalOnlyChats.size > 10_000) {
            notifiedRentalOnlyChats.delete(notifiedRentalOnlyChats.values().next().value);
        }
    } catch (error) {
        console.error(`[ONLYCHATS] Falha ao avisar ${message.platform}/${chatId}:`, error.message || error);
    }
}

module.exports = {
    name: "onlychats",
    priority: 96,
    runOn: "all",

    async execute(message) {
        // Anti-PV trata mensagens no PV; Onlychats não afeta mensagens privadas.
        if (message.isPrivate) {
            return true;
        }

        const isSuperUser = message.sender?.isOwner || isOwner(message);
        if (isSuperUser) {
            return true;
        }

        await rentalHelper.processPendingDeletionNotices(message.platform, message);

        if (isOnlyChatsContextWhitelisted(message)) {
            return true;
        }

        const rentalAccess = rentalHelper.getAccessDecision(message);
        if (rentalAccess) {
            if (rentalAccess.allowed || rentalHelper.isRentalManagementCommand(message)) {
                return true;
            }
            const onlyChatsConfig = getOnlyChatsConfig();
            if (onlyChatsConfig?.enabled && onlyChatsConfig.mode === "reply") {
                await rentalHelper.notifyBlockedAccessOnce(message, onlyChatsConfig.message);
            }
            return false;
        }

        const onlychatsConfig = getOnlyChatsConfig();
        if (!onlychatsConfig || !onlychatsConfig.enabled) {
            return true;
        }

        // 2. Verifica se o chat/servidor/categoria/tópico está autorizado na whitelist
        const isAllowed = isChatAllowedByOnlyChats(message);
        if (isAllowed) {
            return true;
        }

        console.log(`[ONLYCHATS] ⛔ Chat não autorizado | chatId: ${message.chatId} | modo: ${onlychatsConfig.mode}`);

        // Se o modo for 'reply', responde com a mensagem de bloqueio configurada
        if (onlychatsConfig.mode === "reply") {
            const customText = onlychatsConfig.message || "⚠️ Este bot está configurado em modo exclusivo (onlychats) e não está autorizado a responder neste chat/servidor.";
            if (rentalHelper.getSettings(message.platform).enabled) {
                await replyOnlyChatsOnce(message, customText);
            } else if (typeof message.reply === "function") {
                try {
                    await message.reply({ text: customText });
                } catch (error) {
                    console.error(`[ONLYCHATS] Falha ao responder em ${message.platform}/${message.chatId}:`, error.message || error);
                }
            }
        }

        // Retorna false para interromper o processamento da mensagem no core
        return false;
    }
};
