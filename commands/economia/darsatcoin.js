const economy = require("../../functions/economy");
const admin = require("../../functions/economyAdmin");

module.exports = {
    name: "darsatcoin",
    aliases: ["darsatcoins", "addsatcoin"],
    category: "adm/RP",
    description: `➕ Acrescenta a quantidade informada de satcoins ao saldo de um usuário na economia local.

🔐 Disponível para administradores do chat e superusuários.

📝 1. Informe a quantidade de satcoins e o destinatário:
{prefix}darsatcoin <quantidade> <id|@usuário>
{prefix}darsatcoin 500 @usuario
{prefix}darsatcoin 1000 5511999990000

Você também pode responder à mensagem do usuário em vez de mencioná-lo ou digitar o ID.

O valor informado é somado ao saldo atual da carteira do membro neste grupo ou servidor.`,
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
