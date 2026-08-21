const { getOnlyChatsConfig, isChatAllowedByOnlyChats } = require("../functions/config");
const { isOwner } = require("../functions/owners");

module.exports = {
    name: "onlychats",
    priority: 96,
    runOn: "all",

    async execute(message) {
        // Anti-PV trata mensagens no PV; Onlychats não afeta mensagens privadas.
        if (message.isPrivate) {
            return true;
        }

        const onlychatsConfig = getOnlyChatsConfig();
        if (!onlychatsConfig || !onlychatsConfig.enabled) {
            return true;
        }

        // 1. Super Usuários (su) têm passe livre em qualquer chat/servidor
        const isSuperUser = message.sender?.isOwner || isOwner(message);
        if (isSuperUser) {
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
            if (typeof message.reply === "function") {
                await message.reply({ text: customText }).catch(() => {});
            }
        }

        // Retorna false para interromper o processamento da mensagem no core
        return false;
    }
};
