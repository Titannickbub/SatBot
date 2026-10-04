module.exports = {
    name: "id",
    category: null,
    description: "Mostra seu ID, ou o ID de uma pessoa mencionada ou cuja mensagem foi respondida.",
    usage: "{prefix}id [@usuário ou mensagem respondida]",
    examples: [
        "{prefix}id",
        "{prefix}id @usuário"
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
