const { unmuteMember, parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "unmute",
    category: "adm/ações imediatas",
    platformSupport: {
        discord: "full",
        telegram: "full",
        whatsapp: "none"
    },
    description: `🔊 Remove o mute de um usuário no grupo ou servidor.

🎯 Responda à mensagem do usuário, mencione-o ou informe o ID.
🤖 O bot precisa ter permissão para aplicar castigos.
👤 Você também precisa ter permissão para aplicar castigos.
🚫 Este comando não está disponível no WhatsApp.

📌 Uso:
{prefix}unmute <@usuário|id>

💡 Exemplos:
{prefix}unmute @user
{prefix}unmute 123456789012345678`,
    usage: "{prefix}unmute <@usuário|id>",
    examples: [
        "{prefix}unmute @user",
        "{prefix}unmute 123456789012345678"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Comando apenas para grupos/servidores." });
        }

        if (message.platform === "whatsapp") {
            return message.reply({ text: "❌ O unmute não está disponível no WhatsApp." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId, "unmute")
            : message.sender?.isAdmin;

        if (!userOk && !isOwner(message)) {
            return message.reply({ text: "❌ Você precisa ter permissão para aplicar castigos." });
        }

        if (adapter?.checkBotPermission) {
            const botCan = await adapter.checkBotPermission(message.chatId, "unmute");
            if (!botCan) {
                return message.reply({ text: "❌ O bot não tem permissão para remover castigos neste grupo/servidor." });
            }
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