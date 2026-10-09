const { addWarn } = require("../../../functions/warnHelper");
const { parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "warn",
    category: "adm/ações imediatas",
    description: `⚠️ Registra uma advertência para um usuário no grupo ou servidor.

🎯 Mencione o usuário, responda à mensagem dele ou informe o ID.
📝 O motivo é opcional.
🚨 Ao atingir o limite configurado, o usuário será expulso ou banido automaticamente.
👤 Você precisa ter permissão de administrador para advertir.
🤖 Para a punição automática, o bot precisa ter permissão para expulsar ou banir.

📌 Uso:
{prefix}warn <@usuário|id> [motivo]

💡 Exemplos:
{prefix}warn @user
{prefix}warn @user Spam
{prefix}warn 123456789012345678 Envio de links`,
    usage: "{prefix}warn <@usuário|id> [motivo]",
    examples: [
        "{prefix}warn @user",
        "{prefix}warn @user Spam",
        "{prefix}warn 123456789012345678 Envio de links"
    ],

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

        const { targetId } = parseTargetFromMessage(message);
        if (!targetId) {
            return message.reply({ text: "❌ Informe o usuário que deseja advertir (mencione, responda à mensagem ou digite o ID)." });
        }

        let reason = "Sem motivo informado";
        if (message.quoted?.userId) {
            if (message.args.length > 0) {
                reason = message.args.join(" ");
            }
        } else if (message.args.length > 1) {
            reason = message.args.slice(1).join(" ");
        }

        const result = await addWarn(message, targetId, reason);
        if (!result) {
            return message.reply({ text: "❌ Não foi possível aplicar a advertência (falha ao ler configurações)." });
        }

        const targetMention = formatUserMention(message, targetId);

        if (result.punished) {
            const punMsg = result.action === "ban" ? "banido" : "removido";
            return message.reply({
                text: `🚫 Limite de advertências atingido (${result.maxWarns}/${result.maxWarns}). O usuário ${targetMention} foi ${punMsg}!`,
                mentions: message.platform === "whatsapp" ? [targetId] : []
            });
        } else {
            return message.reply({
                text: `⚠️ Usuário ${targetMention} advertido (${result.currentWarns}/${result.maxWarns}).\nMotivo: ${reason}`,
                mentions: message.platform === "whatsapp" ? [targetId] : []
            });
        }
    }
};
