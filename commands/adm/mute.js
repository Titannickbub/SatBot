const { muteMember, parseTargetFromMessage, formatUserMention } = require("../../functions/moderationHelper");
const { isOwner } = require("../../functions/owners");

module.exports = {
    name: "mute",
    category: "adm",
    description: "Silencia um usuário temporariamente. Use respondendo à mensagem do usuário ou digitando o ID.",
    usage: "{prefix}mute <@usuário|id> [tempo_em_minutos]",
    examples: [
        "{prefix}mute 123456789012345678",
        "{prefix}mute @user 15"
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
            return message.reply({ text: "❌ Informe o usuário a ser silenciado. Use resposta à mensagem ou digite o ID." });
        }

        const minutes = parseInt(message.args[1], 10);
        const durationMs = Number.isNaN(minutes) || minutes <= 0 ? 10 * 60 * 1000 : minutes * 60 * 1000;
        const mentioned = formatUserMention(message, targetId);

        try {
            const success = await muteMember(message.platform, { ...message, userId: targetId }, durationMs);
            if (!success) {
                return message.reply({ text: "❌ Este comando não está disponível para a plataforma atual ou o bot não pôde silenciar o usuário." });
            }

            if (targetMessageId) {
                await message.delete(targetMessageId, targetId).catch(() => {});
                await message.delete(message.messageId).catch(() => {});
            }

            return message.reply({ text: `✅ Usuário ${mentioned} silenciado por ${Math.round(durationMs / 60000)} minuto(s).` });
        } catch (err) {
            console.error("[MUTE] Erro ao silenciar usuário:", err);
            return message.reply({ text: "❌ Falha ao silenciar o usuário. Verifique se o bot tem permissão e o ID está correto." });
        }
    }
};