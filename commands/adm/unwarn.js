const { removeWarns } = require("../../functions/warnHelper");
const { isOwner } = require("../../functions/owners");

module.exports = {
    name: "unwarn",
    category: "adm",
    description: "Remove as advertências de um usuário.",
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

        const targetId = message.mentionedJidList?.[0];
        if (!targetId) {
            return message.reply({ text: "❌ Mencione o usuário que deseja perdoar." });
        }

        const amount = parseInt(message.args[1]) || 0; // 0 significa todos

        const success = removeWarns(message, targetId, amount);
        if (success) {
            if (amount > 0) {
                return message.reply({ text: `✅ Foram removidas ${amount} advertência(s) do usuário.` });
            } else {
                return message.reply({ text: `✅ Todas as advertências do usuário foram removidas.` });
            }
        } else {
            return message.reply({ text: "❌ O usuário não possui advertências ou houve erro ao ler." });
        }
    }
};
