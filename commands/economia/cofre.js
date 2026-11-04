const economy = require("../../functions/economy");

module.exports = {
    name: "cofre",
    aliases: ["banco", "vault"],
    category: "economia",
    description: `🏦 Guarda satcoins em um cofre protegido, separado da carteira.

📝 Consulte, deposite ou saque:
{prefix}cofre
{prefix}cofre depositar 500
{prefix}cofre sacar 200

O depósito mínimo é de ${economy.formatMoney(economy.MIN_VAULT_DEPOSIT)}. O saldo do cofre não pode ser usado em compras, apostas, transferências ou roubos; só fica disponível após um saque.`,
    usage: "{prefix}cofre [depositar|sacar] [valor]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O cofre só funciona em grupos ou servidores." });
        }

        const action = normalizeAction(message.args?.[0]);
        if (!action) {
            const { account } = economy.getAccount(message);
            return message.reply({
                text: [
                    "🏦 SEU COFRE",
                    `💳 Carteira disponível: ${economy.formatMoney(account.balance)}`,
                    `🔒 Cofre protegido: ${economy.formatMoney(account.vaultBalance)}`,
                    `💰 Patrimônio total: ${economy.formatMoney(economy.getTotalBalance(account))}`,
                    "",
                    `Depósito mínimo: ${economy.formatMoney(economy.MIN_VAULT_DEPOSIT)}`,
                    "O dinheiro no cofre é inutilizável até ser sacado."
                ].join("\n")
            });
        }

        const amount = parseAmount(message.args?.[1]);
        if (amount === null) {
            return message.reply({
                text: `❌ Informe um valor válido. Exemplo: ${message.prefix}cofre ${action === "deposit" ? "depositar" : "sacar"} 500`
            });
        }

        const result = action === "deposit"
            ? economy.depositToVault(message, amount)
            : economy.withdrawFromVault(message, amount);

        if (!result.moved) {
            const errors = {
                invalid_amount: action === "deposit"
                    ? `O depósito mínimo é ${economy.formatMoney(economy.MIN_VAULT_DEPOSIT)}.`
                    : "Informe um valor maior que zero.",
                insufficient_balance: "Sua carteira não tem saldo suficiente para esse depósito.",
                insufficient_vault: "O cofre não tem saldo suficiente para esse saque."
            };
            return message.reply({
                text: `❌ ${errors[result.reason] || "Não foi possível movimentar o saldo do cofre."}`
            });
        }

        return message.reply({
            text: [
                action === "deposit" ? "✅ Depósito realizado." : "✅ Saque realizado.",
                `💳 Carteira disponível: ${economy.formatMoney(result.balance)}`,
                `🔒 Cofre protegido: ${economy.formatMoney(result.vaultBalance)}`,
                `💰 Patrimônio total: ${economy.formatMoney(result.totalBalance)}`
            ].join("\n")
        });
    }
};

function normalizeAction(value) {
    const action = String(value || "").trim().toLowerCase();
    if (["depositar", "depósito", "deposito", "deposit", "guardar"].includes(action)) return "deposit";
    if (["sacar", "saque", "retirar", "retirada", "withdraw"].includes(action)) return "withdraw";
    return null;
}

function parseAmount(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
    const [whole, cents = ""] = normalized.split(".");
    const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0"));
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
