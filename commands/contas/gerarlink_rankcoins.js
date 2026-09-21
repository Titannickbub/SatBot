const economyAdmin = require("../../functions/economyAdmin");
const webLinks = require("../../functions/webLinks");

module.exports = {
    name: "gerarlink_rankcoins",
    aliases: ["gerarlink-rankcoins", "gerarlink_rankrico", "linkrankcoins", "linkrankrico"],
    category: "contas",
    description: "Gera o link do ranking geral de satcoins do grupo ou servidor.",
    usage: "{prefix}gerarlink_rankcoins",

    async execute(message) {
        if (!economyAdmin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem gerar links dos rankings." });
        }
        if (!webLinks.getBaseUrl()) {
            return message.reply({ text: "❌ O painel web ainda não está configurado. Peça a um super usuário para usar set_dominio." });
        }

        const link = webLinks.ranking(message, "rich");
        if (!link) {
            return message.reply({ text: "❌ Este comando só pode ser usado dentro de um grupo ou servidor." });
        }

        return message.reply({ text: `🔗 Ranking geral de satcoins:\n${link}` });
    }
};
