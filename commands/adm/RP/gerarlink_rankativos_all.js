const economyAdmin = require("../../../functions/economyAdmin");
const webLinks = require("../../../functions/webLinks");

module.exports = {
    name: "gerarlink_rankativos_all",
    aliases: ["gerarlink-rankativos-all", "gerarlink_rankativos_todos"],
    category: "adm/RP",
    description: `👥 Gera um link web com o ranking completo de atividade de todos os membros do grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}gerarlink_rankativos_all

O bot retorna um link exclusivo para abrir o ranking completo no painel web. No WhatsApp, inclui todos os participantes do grupo, inclusive os que ainda não possuem atividade registrada.

⚠️ O painel web precisa estar configurado. Caso contrário, peça a um superusuário para usar o comando set_dominio.`,
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
