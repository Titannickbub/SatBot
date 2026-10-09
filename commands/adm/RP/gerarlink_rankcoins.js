const economyAdmin = require("../../../functions/economyAdmin");
const webLinks = require("../../../functions/webLinks");

module.exports = {
    name: "gerarlink_rankcoins",
    aliases: ["gerarlink-rankcoins", "gerarlink_rankrico", "linkrankcoins", "linkrankrico"],
    category: "adm/RP",
    description: `💰 Gera um link web para consultar o ranking de satcoins (saldos e membros mais ricos) do grupo ou servidor atual.

🔐 Disponível para administradores do chat e superusuários.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}gerarlink_rankcoins

O bot retorna um link exclusivo para abrir e visualizar o ranking de saldos da economia dos membros no painel web.

⚠️ O painel web precisa estar configurado. Caso contrário, peça a um superusuário para usar o comando set_dominio.`,
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
