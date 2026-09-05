const { unmuteMember, parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "unmute",
    category: "adm/ações imediatas",
    description: "Desfaz o mute de um usuário em Discord ou Telegram. Use respondendo à mensagem ou digitando o ID.",
    usage: "{prefix}unmute <@usuário|id>",
    examples: [
        "{prefix}unmute 123456789012345678",
        "{prefix}unmute @user"
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
            return message.reply({ text: "❌ Informe o usuário a ser dessilenciado. Use resposta à mensagem ou digite o ID." });
        }

        const mentioned = formatUserMention(message, targetId);
        try {
            const success = await unmuteMember(message.platform, { ...message, userId: targetId });
            if (!success) {
                return message.reply({ text: "❌ Este comando não está disponível para a plataforma atual ou o bot não pôde dessilenciar o usuário." });
            }
            return message.reply({ text: `✅ Usuário ${mentioned} foi dessilenciado com sucesso.` });
        } catch (err) {
            console.error("[UNMUTE] Erro ao dessilenciar usuário:", err);
            return message.reply({ text: "❌ Falha ao dessilenciar o usuário. Verifique se o bot tem permissão e o ID está correto." });
        }
    }
};