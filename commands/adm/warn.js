const { addWarn } = require("../../functions/warnHelper");
const { isOwner } = require("../../functions/owners");

module.exports = {
    name: "warn",
    category: "adm",
    description: "Aplica uma advertência a um usuário.",
    usage: "{prefix}warn @user [motivo]",

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Comando apenas para grupos/servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;

        if (!userOk && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        const targetId = message.mentionedJidList?.[0];
        if (!targetId) {
            return message.reply({ text: "❌ Mencione o usuário que deseja advertir." });
        }

        const reason = message.args.slice(1).join(" ") || "Sem motivo informado";

        const result = await addWarn(message, targetId, reason);
        if (!result) {
            return message.reply({ text: "❌ Não foi possível aplicar a advertência (falha ao ler configurações)." });
        }

        if (result.punished) {
            const punMsg = result.action === "ban" ? "banido" : "removido";
            return message.reply({ text: `🚫 Limite de advertências atingido (${result.maxWarns}/${result.maxWarns}). O usuário foi ${punMsg}!` });
        } else {
            return message.reply({ text: `⚠️ Usuário advertido (${result.currentWarns}/${result.maxWarns}).\nMotivo: ${reason}` });
        }
    }
};
