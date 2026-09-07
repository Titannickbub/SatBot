const { kickMember, parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "kick",
    category: "adm/ações imediatas",
    platformSupport: {
        discord: "full",
        telegram: "full",
        whatsapp: "full"
    },
    description: "Expulsa um usuário do grupo ou servidor. Use mencionando a mensagem do usuário, menção @ ou passando o ID/número diretamente.",
    usage: "{prefix}kick <@usuário|id>",
    examples: [
        "{prefix}kick 123456789012345678",
        "{prefix}kick @user",
        "{prefix}kick"
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
            const botCan = await adapter.checkBotPermission(message.chatId, "kick");
            if (!botCan) {
                return message.reply({ text: "❌ O bot precisa ser administrador do grupo para expulsar membros." });
            }
        }

        const { targetId, targetMessageId } = parseTargetFromMessage(message);
        if (!targetId) {
            return message.reply({ text: "❌ Informe o usuário a ser expulso. Use resposta à mensagem, menção ou digite o número/ID." });
        }

        const mentioned = formatUserMention(message, targetId);
        try {
            await kickMember(message.platform, { ...message, userId: targetId }, "Expulso por administrador");
            if (targetMessageId && typeof message.delete === "function") {
                await message.delete(targetMessageId, targetId).catch(() => {});
                await message.delete(message.messageId).catch(() => {});
            }
            return message.reply({
                text: `✅ Usuário ${mentioned} expulso com sucesso.`,
                mentions: message.platform === "whatsapp" ? [targetId] : []
            });
        } catch (err) {
            console.error("[KICK] Erro ao expulsar usuário:", err);
            const msgError = err && err.message ? err.message : "Falha ao expulsar o usuário. Verifique se o bot tem permissão e o ID está correto.";
            return message.reply({ text: `❌ ${msgError}` });
        }
    }
};