const economy = require("../../functions/economy");

module.exports = {
    name: "carteira",
    aliases: ["saldo", "wallet"],
    category: "economia",
    description: "Consulta seu saldo de satcoins na economia do grupo ou servidor atual. Os saldos são separados por comunidade.",
    usage: "{prefix}carteira",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A carteira só funciona em grupos ou servidores." });
        }

        const account = economy.getAccount(message);
        const name = message.displayName || message.username || message.userId;
        const balance = economy.formatMoney(account.account.balance);
        const claimNotice = economy.canClaimDaily(message)
            ? `🎁 Resgate disponível: use ${message.prefix}resgatar para receber ${economy.formatMoney(economy.DAILY_REWARD)}.`
            : null;

        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: 0x2ECC71,
                    title: "💰 Carteira",
                    description: [
                        `**Nome:** ${name}`,
                        `**ID:** \`${message.userId}\``,
                        `**Saldo:** ${balance}`,
                        claimNotice ? `\n${claimNotice}` : null
                    ].filter(Boolean).join("\n"),
                    footer: { text: "Economia local deste servidor" }
                }
            });
        }

        if (message.platform === "telegram") {
            const escapeHtml = value => String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");

            return message.reply({
                text: [
                    "<b>💰 CARTEIRA</b>",
                    "━━━━━━━━━━━━━━━━━━━━━━",
                    `<b>Nome:</b> ${escapeHtml(name)}`,
                    `<b>ID:</b> <code>${escapeHtml(message.userId)}</code>`,
                    `<b>Saldo:</b> ${balance}`,
                    claimNotice ? `\n${escapeHtml(claimNotice)}` : null
                ].filter(Boolean).join("\n"),
                parse_mode: "HTML"
            });
        }

        const escapeMarkdown = value => String(value).replace(/([*_~`\\])/g, "\\$1");
        return message.reply({
            text: [
                "*💰 CARTEIRA*",
                "━━━━━━━━━━━━━━━━━━━━━━",
                `*Nome:* ${escapeMarkdown(name)}`,
                `*ID:* \`${escapeMarkdown(message.userId)}\``,
                `*Saldo:* ${balance}`,
                claimNotice ? `\n_${escapeMarkdown(claimNotice)}_` : null
            ].filter(Boolean).join("\n")
        });
    }
};
