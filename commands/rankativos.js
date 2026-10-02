const activity = require("../functions/activity");
const { renderRanking } = require("../functions/imageBanner");

function userName(user) {
    return user.displayName || user.username || user.userId;
}

module.exports = {
    name: "rankativos",
    aliases: ["rankingativos", "ranking-ativos", "rankatividade"],
    category: "adm/RP",
    description: "Mostra os cinco usuários mais ativos do grupo ou servidor.",
    usage: "{prefix}rankativos",

    async execute(message) {
        const result = activity.ranking(message);
        if (!result) return message.reply({ text: "❌ O ranking de atividade só funciona em grupos ou servidores." });
        if (!result.enabled) {
            return message.reply({ text: "ℹ️ O sistema de atividade está desativado neste grupo/servidor." });
        }
        if (!result.users.length) {
            return message.reply({ text: "ℹ️ Ainda não há atividade registrada neste grupo/servidor." });
        }

        const rendered = await renderRanking(message, "activity");
        if (rendered.error) return message.reply({ text: `❌ ${rendered.error}` });
        return message.replyImg({ image: rendered.buffer, caption: rendered.caption, fileName: "rankatividade.png" });
    }
};
