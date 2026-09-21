const economyAdmin = require("../../functions/economyAdmin");
const { renderRanking } = require("../../functions/imageBanner");

module.exports = {
    name: "img_rankxp",
    aliases: ["img-rankxp", "rankxpimg"],
    category: "contas",
    description: "Gera uma imagem do ranking de XP.",
    usage: "{prefix}img_rankxp",

    async execute(message) {
        if (!economyAdmin.isAdmin(message)) return message.reply({ text: "❌ Apenas administradores podem gerar imagens dos rankings." });
        const result = await renderRanking(message, "xp");
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        return message.replyImg({ image: result.buffer, caption: result.caption, fileName: "rankxp.png" });
    }
};
