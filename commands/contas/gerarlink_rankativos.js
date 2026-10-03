const economyAdmin = require("../../functions/economyAdmin");
const webLinks = require("../../functions/webLinks");

module.exports = {
    name: "gerarlink_rankativos",
    aliases: ["gerarlink-rankativos", "linkrankativos", "gerarlink_atividade"],
    category: "contas",
    description: "Gera um link web para consultar o ranking de atividade dos membros do grupo ou servidor atual.",
    usage: "{prefix}gerarlink_rankativos",

    async execute(message) {
        if (!economyAdmin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem gerar links dos rankings." });
        }
        if (!webLinks.getBaseUrl()) {
            return message.reply({ text: "❌ O painel web ainda não está configurado. Peça a um super usuário para usar set_dominio." });
        }

        const link = webLinks.ranking(message, "activity");
        if (!link) {
            return message.reply({ text: "❌ Este comando só pode ser usado dentro de um grupo ou servidor." });
        }

        return message.reply({ text: `🔗 Ranking de atividade:\n${link}` });
    }
};
