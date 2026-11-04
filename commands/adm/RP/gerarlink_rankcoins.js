const economyAdmin = require("../../../functions/economyAdmin");
const webLinks = require("../../../functions/webLinks");

module.exports = {
    name: "gerarlink_rankcoins",
    aliases: ["gerarlink-rankcoins", "gerarlink_rankrico", "linkrankcoins", "linkrankrico"],
    category: "adm/economia",
    description: `💰 Gera um link web para consultar o ranking de saldo disponível na carteira do grupo ou servidor atual.

🔐 Disponível para administradores do chat e superusuários.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}gerarlink_rankcoins

O bot retorna um link exclusivo para visualizar os saldos de carteira em ordem de riqueza, com os valores de carteira e cofre exibidos separadamente. O saldo guardado no cofre não conta para a posição.

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

        return webLinks.replyWithLink(message, link, "🔗 Ranking de saldo da carteira:");
    }
};
