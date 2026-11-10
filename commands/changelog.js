const { getCurrentChangelog } = require("../functions/changelog");

module.exports = {
    name: "changelog",
    aliases: ["novidades"],
    category: null,
    description: `📰 Exibe as novidades e correções da versão atual.

📌 Uso:
{prefix}changelog
{prefix}novidades`,
    usage: "{prefix}changelog",

    async execute(message) {
        const changelog = getCurrentChangelog();
        const sections = [
            `Novidades da versão ${changelog.version}`,
            ...(changelog.features.length
                ? ["", "✨ Novas funções", ...changelog.features.map(item => `• ${item}`)]
                : []),
            "",
            "🛠️ Correções",
            ...changelog.fixes.map(item => `• ${item}`)
        ];
        const text = sections.join("\n");

        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: 0x8877ff,
                    title: `📰 Novidades · v${changelog.version}`,
                    description: text
                }
            });
        }

        if (message.platform === "telegram") {
            const escapeHtml = value => String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            return message.reply({
                text: `<b>📰 Novidades · v${escapeHtml(changelog.version)}</b>\n\n` +
                    sections.slice(2).map(escapeHtml).join("\n"),
                parse_mode: "HTML"
            });
        }

        const escapeMarkdown = value => String(value).replace(/([*_~`\\])/g, "\\$1");
        const whatsappText = [
            `📰 *Novidades · v${escapeMarkdown(changelog.version)}*`,
            ...(changelog.features.length
                ? ["", "*✨ Novas funções*", ...changelog.features.map(item => `• ${escapeMarkdown(item)}`)]
                : []),
            "",
            "*🛠️ Correções*",
            ...changelog.fixes.map(item => `• ${escapeMarkdown(item)}`)
        ].join("\n");
        return message.reply({ text: whatsappText });
    }
};
