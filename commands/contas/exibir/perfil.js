const { renderProfile } = require("../../../functions/imageBanner");

module.exports = {
    name: "perfil",
    aliases: ["profile", "minhaconta"],
    category: "contas/exibir",
    description: `👤 Gera uma imagem personalizada do perfil com nível, XP, satcoins, casamento e atividade no grupo ou servidor atual.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}perfil
{prefix}perfil @usuário

O bot gera e envia um banner com seus dados ou os da pessoa marcada, informada ou citada ao responder uma mensagem.

ℹ️ Para visualizar essas informações em formato de texto, utilize o comando {prefix}perfil_text.`,
    usage: "{prefix}perfil @marcar",

    async execute(message) {
        const target = resolveTarget(message);
        if (target?.error) {
            return message.reply({ text: `❌ ${target.error}` });
        }
        const profileMessage = target
            ? { ...message, ...target }
            : message;
        const result = await renderProfile(profileMessage);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        return message.replyImg({
            image: result.buffer,
            caption: `${result.caption}\n\nℹ️ O modelo em texto está disponível em ${message.prefix}perfil_text.`,
            fileName: "perfil.png"
        });
    }
};

function resolveTarget(message) {
    const mentionedUser = message.platform === "discord"
        ? message.raw?.mentions?.users?.first?.()
        : null;
    const candidates = [
        message.quoted?.userId,
        mentionedUser?.id,
        ...(message.mentionedJids || []),
        message.args?.[0]
    ].filter(Boolean);

    for (const candidate of candidates) {
        const value = String(candidate).trim();
        const discordMention = value.match(/^<@!?(\d+)>$/);
        const userId = discordMention ? discordMention[1] : value;
        const isWhatsAppId = message.platform === "whatsapp" &&
            /^\d+(?:@(s\.whatsapp\.net|c\.us|lid))?$/.test(userId);
        if (!/^\d+$/.test(userId) && !isWhatsAppId) continue;

        return {
            userId,
            username: mentionedUser && String(mentionedUser.id) === userId
                ? mentionedUser.username
                : message.quoted && String(message.quoted.userId) === userId
                    ? message.quoted.username
                    : null,
            displayName: mentionedUser && String(mentionedUser.id) === userId
                ? message.raw?.mentions?.members?.first?.()?.displayName || mentionedUser.globalName || mentionedUser.username
                : message.quoted && String(message.quoted.userId) === userId
                    ? message.quoted.displayName || message.quoted.username
                    : null
        };
    }

    if (message.args?.[0]) {
        return { error: "Não consegui identificar a pessoa. Marque-a, responda à mensagem dela ou informe o ID." };
    }

    return null;
}
