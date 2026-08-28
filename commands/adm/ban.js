const { banMember, parseTargetFromMessage, formatUserMention } = require("../../functions/moderationHelper");
const { isOwner } = require("../../functions/owners");

module.exports = {
    name: "ban",
    aliases: ["kill"],
    category: "adm",
    description: "Bane um usuário do grupo ou servidor. Use respondendo à mensagem do usuário ou digitando o ID.",
    usage: "{prefix}ban <@usuário|id>",
    examples: [
        "{prefix}ban 123456789012345678",
        "{prefix}ban @user"
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

        const { targetId, targetMessageId } = parseTargetFromMessage(message);
        if (!targetId) {
            return message.reply({ text: "❌ Informe o usuário a ser banido. Use resposta à mensagem ou digite o ID." });
        }

        const mentioned = formatUserMention(message, targetId);
        try {
            await banMember(message.platform, { ...message, userId: targetId });
            if (targetMessageId) {
                await message.delete(targetMessageId, targetId).catch(() => {});
                await message.delete(message.messageId).catch(() => {});
            }
            return message.reply({ text: `✅ Usuário ${mentioned} banido com sucesso.` });
        } catch (err) {
            console.error("[BAN] Erro ao banir usuário:", err);
            return message.reply({ text: "❌ Falha ao banir o usuário. Verifique se o bot tem permissão e o ID está correto." });
        }
    }
};