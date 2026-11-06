const economy = require("../../functions/economy");

module.exports = {
    name: "cofre",
    aliases: ["banco", "vault"],
    category: "economia",
    description: `🏦 Guarda satcoins em um cofre separado da carteira.

📝 Consulte, deposite ou saque:
{prefix}cofre
{prefix}cofre depositar 500
{prefix}cofre sacar 500

O limite é de um depósito e um saque por dia, com o mínimo definido pelos administradores. Conforme o modo configurado, o saldo pode ser seguro, sofrer imposto ou ficar exposto a roubos.`,
    usage: "{prefix}cofre [depositar|sacar] [valor]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O cofre só funciona em grupos ou servidores." });
        }

        const action = normalizeAction(message.args?.[0]);
        if (!action) {
            const { account } = economy.getAccount(message);
            const config = economy.getVaultConfig(message);
            const today = economy.getLocalDate();
            return message.reply({
                text: [
                    "🏦 SEU COFRE",
                    `💳 Carteira disponível: ${economy.formatMoney(account.balance)}`,
                    `🔒 Cofre: ${economy.formatMoney(account.vaultBalance)}`,
                    `💰 Patrimônio total: ${economy.formatMoney(economy.getTotalBalance(account))}`,
                    "",
                    `Modo: ${modeLabel(config.mode)}`,
                    `Mínimo por movimentação: ${economy.formatMoney(config.minimumMovement)}`,
                    `Depósito hoje: ${account.vaultDepositDate === today ? "já utilizado" : "disponível"} · Saque hoje: ${account.vaultWithdrawDate === today ? "já utilizado" : "disponível"}`,
                    ...(config.mode === "tax" ? [`Imposto: ${config.taxType === "percent" ? `${formatPercent(config.taxRateBasisPoints)} por 24h` : `${economy.formatMoney(config.taxFixedAmount)} por 24h`}`] : []),
                    ...(config.mode === "robbery" ? [`Chance do roubo atingir o cofre: ${config.robberyVaultChance}%`] : [])
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
                    ? `O valor mínimo por movimentação é ${economy.formatMoney(result.minimumMovement)}.`
                    : `O valor mínimo por movimentação é ${economy.formatMoney(result.minimumMovement)}.`,
                insufficient_balance: "Sua carteira não tem saldo suficiente para esse depósito.",
                insufficient_vault: "O cofre não tem saldo suficiente para esse saque.",
                daily_limit: `Você já fez ${action === "deposit" ? "um depósito" : "um saque"} hoje. Tente novamente amanhã.`
            };
            return message.reply({
                text: `❌ ${errors[result.reason] || "Não foi possível movimentar o saldo do cofre."}`
            });
        }

        return message.reply({
            text: [
                action === "deposit"
                    ? "✅ Depósito realizado."
                    : result.shortfall > 0
                        ? "⚠️ O imposto reduziu o saldo disponível. Sacamos o máximo possível."
                        : result.amount > 0
                            ? "✅ Saque realizado."
                            : "⚠️ O imposto consumiu o saldo disponível; nenhum valor restou para sacar.",
                result.taxPaid > 0 ? `Imposto descontado do saldo anterior: ${economy.formatMoney(result.taxPaid)} (${result.taxPeriods} período(s) de 24h).` : null,
                action === "withdraw" && result.shortfall > 0
                    ? `Valor solicitado: ${economy.formatMoney(result.requestedAmount)} · Sacado: ${economy.formatMoney(result.amount)}`
                    : null,
                `💳 Carteira disponível: ${economy.formatMoney(result.balance)}`,
                `${result.mode === "secure" ? "🔒 Cofre protegido" : "🔒 Saldo no cofre"}: ${economy.formatMoney(result.vaultBalance)}`,
                `💰 Patrimônio total: ${economy.formatMoney(result.totalBalance)}`
            ].filter(Boolean).join("\n")
        });
    }
};

function modeLabel(mode) {
    return ({ secure: "Impenetrável", tax: "Imposto progressivo", robbery: "Roubo permitido" })[mode] || mode;
}

function formatPercent(basisPoints) {
    return `${(basisPoints / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")}%`;
}

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
