const { muteMember, parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "mute",
    category: "adm/ações imediatas",
    platformSupport: {
        discord: "full",
        telegram: "full",
        whatsapp: "none"
    },
    description: `🔇 Silencia temporariamente um usuário do grupo ou servidor.

🎯 Responda à mensagem do usuário, mencione-o ou informe o ID.
⏱️ Informe a duração em minutos. Se não informar, o mute será de 10 minutos.
🤖 O bot precisa ter permissão para aplicar castigos.
👤 Você também precisa ter permissão para aplicar castigos.
🚫 Este comando não está disponível no WhatsApp.

📌 Uso:
{prefix}mute <@usuário|id> [minutos]

💡 Exemplos:
{prefix}mute @user
{prefix}mute @user 15
{prefix}mute 123456789012345678 30`,
    usage: "{prefix}mute <@usuário|id> [tempo_em_minutos]",
    examples: [
        "{prefix}mute @user",
        "{prefix}mute @user 15",
        "{prefix}mute 123456789012345678 30"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Comando apenas para grupos/servidores." });
        }

        if (message.platform === "whatsapp") {
            return message.reply({ text: "❌ O mute não está disponível no WhatsApp." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId, "mute")
            : message.sender?.isAdmin;

        if (!userOk && !isOwner(message)) {
            return message.reply({ text: "❌ Você precisa ter permissão para aplicar castigos." });
        }

        if (adapter?.checkBotPermission) {
            const botCan = await adapter.checkBotPermission(message.chatId, "mute");
            if (!botCan) {
                return message.reply({ text: "❌ O bot não tem permissão para aplicar castigos neste grupo/servidor." });
            }
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