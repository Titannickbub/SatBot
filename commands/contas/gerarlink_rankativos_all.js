const economyAdmin = require("../../functions/economyAdmin");
const webLinks = require("../../functions/webLinks");

module.exports = {
    name: "gerarlink_rankativos_all",
    aliases: ["gerarlink-rankativos-all", "gerarlink_rankativos_todos"],
    category: "adm/RP",
    description: "Gera um link web com todos os membros no ranking de atividade. No WhatsApp inclui todos os participantes, mesmo sem atividade registrada.",
    usage: "{prefix}gerarlink_rankativos_all",

    async execute(message) {
        if (!economyAdmin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem gerar links dos rankings." });
        }
        if (!webLinks.getBaseUrl()) {
            return message.reply({ text: "❌ O painel web ainda não está configurado. Peça a um super usuário para usar set_dominio." });
        }

        const link = webLinks.ranking(message, "activity_all");
        if (!link) {
            return message.reply({ text: "❌ Este comando só pode ser usado dentro de um grupo ou servidor." });
        }

        return message.reply({ text: `🔗 Ranking completo de atividade:\n${link}` });
    }
};
