const { banMember, parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "ban",
    aliases: ["kill"],
    category: "adm/ações imediatas",
    platformSupport: {
        discord: "full",
        telegram: "full",
        whatsapp: "full"
    },
    description: "Bane um usuário do grupo ou servidor. Use respondendo à mensagem do usuário, mencionando ou digitando o ID/número.",
    usage: "{prefix}ban <@usuário|id>",
    examples: [
        "{prefix}ban 123456789012345678",
        "{prefix}ban @user",
        "{prefix}ban"
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

        if (adapter?.checkBotPermission) {
            const botCan = await adapter.checkBotPermission(message.chatId, "ban");
            if (!botCan) {
                return message.reply({ text: "❌ O bot precisa ser administrador do grupo para banir membros." });
            }
        }

        const { targetId, targetMessageId } = parseTargetFromMessage(message);
        if (!targetId) {
            return message.reply({ text: "❌ Informe o usuário a ser banido. Use resposta à mensagem, menção ou digite o número/ID." });
        }

        const mentioned = formatUserMention(message, targetId);
        try {
            await banMember(message.platform, { ...message, userId: targetId }, "Banido por administrador");
            if (targetMessageId && typeof message.delete === "function") {
                await message.delete(targetMessageId, targetId).catch(() => {});
                await message.delete(message.messageId).catch(() => {});
            }
            return message.reply({
                text: `✅ Usuário ${mentioned} banido com sucesso.`,
                mentions: message.platform === "whatsapp" ? [targetId] : []
            });
        } catch (err) {
            console.error("[BAN] Erro ao banir usuário:", err);
            const msgError = err && err.message ? err.message : "Falha ao banir o usuário. Verifique se o bot tem permissão e o ID está correto.";
            return message.reply({ text: `❌ ${msgError}` });
        }
    }
};