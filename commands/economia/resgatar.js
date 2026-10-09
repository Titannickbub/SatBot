const economy = require("../../functions/economy");

module.exports = {
    name: "resgatar",
    aliases: ["daily", "diario", "diária"],
    category: "economia",
    description: `🎁 Resgata a recompensa diária gratuita de satcoins na economia local do grupo ou servidor.

📝 1. Execute o comando para coletar seu bônus do dia:
{prefix}resgatar

O bot credita o valor do bônus diário diretamente na sua carteira.

⏳ Disponível uma vez por dia (reinicia na virada do dia).`,
    usage: "{prefix}resgatar",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O resgate só funciona em grupos ou servidores." });
        }

        const result = economy.claimDaily(message);
        const name = message.displayName || message.username || message.userId;
        const gained = economy.formatMoney(result.amount);
        const balance = economy.formatMoney(result.balance);
        const rewardLabel = result.claimed
            ? `💰 Saldo ganho: ${gained}`
            : `⏳ Nenhum satcoin resgatado`;
        const status = result.claimed
            ? "✅ Recompensa diária resgatada!"
            : "⏳ Você já resgatou sua recompensa diária neste grupo/servidor.";

        if (message.platform === "discord") {
            return message.reply({
                embed: {
                    color: result.claimed ? 0x2ECC71 : 0xF1C40F,
                    title: "🎁 Resgate diário",
                    description: [
                        `**Nome:** ${name}`,
                        rewardLabel,
                        `**Saldo atual:** ${balance}`,
                        `\n${status}`,
                        !result.claimed ? "Tente novamente após a próxima virada do dia." : null
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
                    "<b>🎁 RESGATE DIÁRIO</b>",
                    "━━━━━━━━━━━━━━━━━━━━━━",
                    `<b>Nome:</b> ${escapeHtml(name)}`,
                    rewardLabel,
                    `<b>Saldo atual:</b> ${balance}`,
                    `\n${escapeHtml(status)}`,
                    !result.claimed ? "Tente novamente após a próxima virada do dia." : null
                ].filter(Boolean).join("\n"),
                parse_mode: "HTML"
            });
        }

        const escapeMarkdown = value => String(value).replace(/([*_~`\\])/g, "\\$1");
        return message.reply({
            text: [
                "*🎁 RESGATE DIÁRIO*",
                "━━━━━━━━━━━━━━━━━━━━━━",
                `*Nome:* ${escapeMarkdown(name)}`,
                rewardLabel,
                `*Saldo atual:* ${balance}`,
                `\n_${escapeMarkdown(status)}_`,
                !result.claimed ? "Tente novamente após a próxima virada do dia." : null
            ].filter(Boolean).join("\n")
        });
    }
};
