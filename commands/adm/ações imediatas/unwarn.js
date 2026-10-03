const { removeWarns } = require("../../../functions/warnHelper");
const { parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "unwarn",
    category: "adm/ações imediatas",
    description: "Remove uma ou mais advertências do usuário indicado, permitindo corrigir punições registradas por engano. Informe o usuário e, opcionalmente, quantas advertências remover.",
    usage: "{prefix}unwarn @user [quantidade (opcional)]",

    async execute(message) {
        if (message.isPrivate) return message.reply({ text: "❌ Comando apenas para grupos/servidores." });

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;

        if (!userOk && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        const { targetId } = parseTargetFromMessage(message);
        if (!targetId) {
            return message.reply({ text: "❌ Informe o usuário que deseja perdoar (mencione, responda à mensagem ou digite o ID)." });
        }

        let amount = 0;
        if (message.quoted?.userId) {
            amount = parseInt(message.args[0]) || 0;
        } else {
            amount = parseInt(message.args[1]) || 0;
        }

        const success = removeWarns(message, targetId, amount);
        const targetMention = formatUserMention(message, targetId);

        if (success) {
            if (amount > 0) {
                return message.reply({
                    text: `✅ Foram removidas ${amount} advertência(s) de ${targetMention}.`,
                    mentions: message.platform === "whatsapp" ? [targetId] : []
                });
            } else {
                return message.reply({
                    text: `✅ Todas as advertências de ${targetMention} foram removidas.`,
                    mentions: message.platform === "whatsapp" ? [targetId] : []
                });
            }
        } else {
            return message.reply({ text: "❌ O usuário não possui advertências ou houve erro ao ler." });
        }
    }
};
