const { kickMember, parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "kick",
    category: "adm/ações imediatas",
    description: "Expulsa um usuário do grupo ou servidor. Use mencionando a mensagem do usuário ou passando o ID diretamente.",
    usage: "{prefix}kick <@usuário|id>",
    examples: [
        "{prefix}kick 123456789012345678",
        "{prefix}kick @user",
        "{prefix}kick" // use resposta à mensagem do usuário
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
            return message.reply({ text: "❌ Informe o usuário a ser expulso. Use resposta à mensagem ou digite o ID." });
        }

        const mentioned = formatUserMention(message, targetId);
        try {
            await kickMember(message.platform, { ...message, userId: targetId });
            if (targetMessageId) {
                await message.delete(targetMessageId, targetId).catch(() => {});
                await message.delete(message.messageId).catch(() => {});
            }
            return message.reply({ text: `✅ Usuário ${mentioned} expulso com sucesso.` });
        } catch (err) {
            console.error("[KICK] Erro ao expulsar usuário:", err);
            return message.reply({ text: "❌ Falha ao expulsar o usuário. Verifique se o bot tem permissão e o ID está correto." });
        }
    }
};