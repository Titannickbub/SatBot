const xp = require("../functions/xp");
const { renderRanking } = require("../functions/imageBanner");

module.exports = {
    name: "rankxp",
    aliases: ["rankingxp", "ranking-xp"],
    category: "adm/RP",
    description: "Gera uma imagem com os membros ordenados pelo XP no grupo ou servidor. Use `melhores` para os maiores valores ou `piores` para os menores.",
    usage: "{prefix}rankxp [melhores|piores]",

    async execute(message) {
        const data = xp.load(message);
        if (!data) return message.reply({ text: "❌ O XP só funciona em grupos ou servidores." });
        if (!data.enabled) return message.reply({ text: "ℹ️ O sistema de XP está desativado neste grupo/servidor." });

        const option = String(message.args?.[0] || "").toLocaleLowerCase();
        if (option && !["melhores", "melhor", "piores", "pior"].includes(option)) {
            return message.reply({ text: `❌ Opção inválida. Use ${message.prefix}rankxp melhores ou ${message.prefix}rankxp piores.` });
        }
        const order = ["piores", "pior"].includes(option) ? "poor" : "rich";
        const result = await renderRanking(message, "xp", order);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        return message.replyImg({ image: result.buffer, caption: result.caption, fileName: "rankxp.png" });
    }
};
