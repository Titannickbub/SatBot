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
    description: `🔨 Bane permanentemente um usuário do grupo ou servidor.

🎯 Responda à mensagem do usuário, mencione-o, informe o ID/número ou marque uma mensagem.
🤖 O bot precisa ter permissão para banir membros.
👤 Você também precisa ter permissão para banir membros.

📌 Uso:
{prefix}ban <@usuário|#mensagem|id/número>

💡 Exemplos:
{prefix}ban @user
{prefix}ban #mensagem
{prefix}ban @titannickbub
{prefix}ban 0000000000`,
    usage: "{prefix}ban <@usuário|#mensagem|id/número>",
    examples: [
        "{prefix}ban @user",
        "{prefix}ban #mensagem",
        "{prefix}ban @titannickbub",
        "{prefix}ban 0000000000"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Comando apenas para grupos/servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId, "ban")
            : message.sender?.isAdmin;

        if (!userOk && !isOwner(message)) {
            return message.reply({ text: "❌ Você precisa ter permissão para banir membros." });
        }

        if (adapter?.checkBotPermission) {
            const botCan = await adapter.checkBotPermission(message.chatId, "ban");
            if (!botCan) {
                return message.reply({ text: "❌ O bot não tem permissão para banir membros neste grupo/servidor." });
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