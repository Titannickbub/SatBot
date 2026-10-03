const economy = require("../../functions/economy");
const admin = require("../../functions/economyAdmin");

module.exports = {
    name: "setsatcoin",
    aliases: ["setsatcoins", "setcoins"],
    category: "adm/RP",
    description: "Substitui o saldo atual de satcoins de outro usuário pelo valor informado na economia deste grupo ou servidor. Informe o valor e depois a menção ou o ID.",
    usage: "{prefix}setsatcoin <valor> <id|@usuário>",

    async execute(message) {
        if (!economy.getScope(message)) return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
        if (!admin.isAdmin(message)) return message.reply({ text: "❌ Apenas administradores podem usar este comando." });

        const amount = admin.parseAmount(message.args?.[0]);
        const target = admin.resolveTarget(message, message.args?.slice(1).join(" ").trim());
        if (amount === null || !target) {
            return message.reply({ text: `❌ Uso: ${message.prefix}${message.command} <valor> <id|@usuário> ou responda à mensagem do usuário.` });
        }

        const result = economy.adjustBalance(message, target, amount, "set");
        if (!result) {
            return message.reply({ text: "❌ Esse usuário ainda não possui uma carteira de economia neste grupo/servidor." });
        }
        return message.reply({
            text: `✅ Saldo definido para ${target.displayName || target.username || target.userId}.\nSaldo anterior: ${economy.formatMoney(result.previousBalance)}\nSaldo atual: ${economy.formatMoney(result.balance)}`
        });
    }
};
