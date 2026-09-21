const { formatUserMention } = require("../../functions/moderationHelper");

module.exports = {
    name: "porcentagem",
    aliases: ["porcent", "%", "pct"],
    category: "diversão",
    description: "Calcula uma porcentagem aleatória para um usuário e um argumento.",
    usage: "{prefix}porcentagem <argumento> [@membro ou mensagem respondida]",

    async execute(message) {
        const argument = String(message.args?.[0] || "").trim();
        if (!argument) {
            return message.reply({
                text: `❌ Informe o argumento.\nExemplo: ${message.prefix}porcentagem gay @membro`
            });
        }

        const mentionedId = message.mentionedJidList?.[0] || message.mentionedJids?.[0] || null;
        const targetId = mentionedId || message.quoted?.userId || message.userId;
        const whatsappTargetJid = message.platform === "whatsapp"
            ? normalizeWhatsAppJid(targetId)
            : null;
        const percentage = Math.floor(Math.random() * 101);
        const telegramTargetName = message.quoted?.username
            ? `@${message.quoted.username}`
            : message.quoted?.displayName
                || (String(targetId).startsWith("@") ? String(targetId) : null)
                || (String(targetId) === String(message.userId) ? message.displayName || message.username : null)
                || "usuário";
        const target = message.platform === "telegram"
            ? (/^\d+$/.test(String(targetId))
                ? `<a href="tg://user?id=${encodeURIComponent(String(targetId))}">${escapeHtml(telegramTargetName)}</a>`
                : escapeHtml(telegramTargetName))
            : message.platform === "whatsapp"
                ? `@${whatsappTargetJid.split("@")[0].split(":")[0]}`
                : formatUserMention(message, String(targetId));
        const reply = {
            text: `🎲 ${target} é ${percentage}% ${message.platform === "telegram" ? escapeHtml(argument) : argument}!`
        };

        if (message.platform === "whatsapp") {
            reply.mentions = [whatsappTargetJid];
        } else if (message.platform === "telegram") {
            reply.parse_mode = "HTML";
        }

        return message.reply(reply);
    }
};

function normalizeWhatsAppJid(targetId) {
    const value = String(targetId || "").trim().replace(/^@/, "");
    if (value.includes("@")) return value;
    return `${value}@s.whatsapp.net`;
}

function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
