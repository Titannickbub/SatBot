const economyAdmin = require("../../functions/economyAdmin");
const { renderRanking } = require("../../functions/imageBanner");

module.exports = {
    name: "img_rankcoins",
    aliases: ["img-rankcoins", "img_rankcoin", "img_rankrico", "rankcoinsimg", "rankricoimg"],
    category: "contas",
    description: "Gera uma imagem do ranking de satcoins.",
    usage: "{prefix}img_rankcoins",

    async execute(message) {
        if (!economyAdmin.isAdmin(message)) return message.reply({ text: "❌ Apenas administradores podem gerar imagens dos rankings." });
        const result = await renderRanking(message, "rich");
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        return message.replyImg({ image: result.buffer, caption: result.caption, fileName: "rankcoins.png" });
    }
};
