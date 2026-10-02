const economy = require("../../functions/economy");
const admin = require("../../functions/economyAdmin");

module.exports = {
    name: "darsatcoin",
    aliases: ["darsatcoins", "addsatcoin"],
    category: "adm/RP",
    description: "Adiciona satcoins ao saldo de um usuário.",
    usage: "{prefix}darsatcoin <valor> <id|@usuário>",

    async execute(message) {
        return executeBalanceCommand(message, "add", "dar");
    }
};

async function executeBalanceCommand(message, operation, action) {
    if (!economy.getScope(message)) return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
    if (!admin.isAdmin(message)) return message.reply({ text: "❌ Apenas administradores podem usar este comando." });

    const amount = admin.parseAmount(message.args?.[0]);
    const target = admin.resolveTarget(message, message.args?.slice(1).join(" ").trim());
    if (amount === null || !target) {
        return message.reply({ text: `❌ Uso: ${message.prefix}${message.command} <valor> <id|@usuário> ou responda à mensagem do usuário.` });
    }

    const result = economy.adjustBalance(message, target, amount, operation);
    if (!result) {
        return message.reply({ text: "❌ Esse usuário ainda não possui uma carteira de economia neste grupo/servidor." });
    }
    return message.reply({
        text: `✅ ${action === "dar" ? "Saldo adicionado" : "Saldo atualizado"} para ${target.displayName || target.username || target.userId}.\nSaldo anterior: ${economy.formatMoney(result.previousBalance)}\nSaldo atual: ${economy.formatMoney(result.balance)}`
    });
}
