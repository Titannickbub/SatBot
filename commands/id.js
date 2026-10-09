const DESCRIPTION = `🆔 Consulta o identificador único (ID/JID) de usuário na plataforma atual.

🔐 Comando público disponível para todos os usuários.

📌 Formas de consulta:
• 👤 Seu próprio ID: envie o comando sem argumentos.
• 👥 ID de outro usuário: mencione a pessoa com @ ou responda a uma mensagem dela.

🔍 1. Consultar seu próprio ID:
{prefix}id

👥 2. Consultar o ID de outro membro:
{prefix}id @usuario

💬 3. Consultar respondendo a uma mensagem:
Responda a qualquer mensagem do usuário desejado com {prefix}id.

ℹ️ Útil para configurações do bot, permissões, comandos administrativos e identificação entre plataformas.`;

module.exports = {
    name: "id",
    category: "utilitários",
    description: DESCRIPTION,
    usage: "{prefix}id [@usuário ou respondendo à mensagem]",
    examples: [
        "{prefix}id",
        "{prefix}id @usuario"
    ],

    async execute(message) {
        const mentionedId = getMentionedUserId(message);
        const quotedId = message.quoted?.userId;
        const userId = mentionedId || quotedId || message.userId;

        if (!userId) {
            return message.reply({ text: "❌ Não foi possível identificar o ID deste usuário." });
        }

        if (!mentionedId && !quotedId && hasUnresolvedTelegramMention(message)) {
            return message.reply({
                text: "❌ Essa menção não contém o ID do usuário. Selecione a pessoa na lista de sugestões do Telegram ou responda a uma mensagem dela."
            });
        }

        return message.reply({ text: `🆔 ID do usuário: ${userId}` });
    }
};

function getMentionedUserId(message) {
    if (message.platform === "discord") {
        const user = message.raw?.mentions?.users?.first?.();
        if (user?.id) return String(user.id);
    }

    const mentions = [
        ...(Array.isArray(message.mentionedJids) ? message.mentionedJids : []),
        ...(Array.isArray(message.mentionedJidList) ? message.mentionedJidList : [])
    ];

    return mentions
        .map(value => String(value || "").trim())
        .find(value => {
            if (!value) return false;
            return message.platform === "whatsapp"
                ? value.includes("@")
                : /^\d+$/.test(value);
        }) || null;
}

function hasUnresolvedTelegramMention(message) {
    if (message.platform !== "telegram") return false;

    const mentions = Array.isArray(message.mentionedJids) ? message.mentionedJids : [];
    return mentions.some(value => String(value || "").trim().startsWith("@"));
}
