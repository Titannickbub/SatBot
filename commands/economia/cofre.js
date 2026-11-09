const economy = require("../../functions/economy");

module.exports = {
    name: "cofre",
    aliases: ["banco", "vault"],
    category: "economia",
    description: "Consulte o cofre e transfira SatCoins entre ele e sua carteira.",
    usage: "{prefix}cofre help",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O cofre só funciona em grupos ou servidores." });
        }

        if (["help", "ajuda"].includes(normalizeCommand(message.args?.[0]))) {
            return message.reply({ text: formatHelp(message.prefix || "!", economy.getVaultConfig(message)) });
        }

        const action = normalizeAction(message.args?.[0]);
        if (!action) {
            const { account } = economy.getAccount(message);
            const config = economy.getVaultConfig(message);
            const taxPreview = economy.getVaultTaxPreview(message);
            const prefix = message.prefix || "!";
            return message.reply({
                text: [
                    `🏦 Cofre: ${economy.formatMoney(account.vaultBalance)}`,
                    `⏱️ Horas acumuladas: ${config.mode === "tax" ? `${taxPreview.periods} hora(s)` : "—"}`,
                    `🧾 Imposto: ${config.mode === "tax" ? economy.formatMoney(taxPreview.amount) : "não se aplica"}`,
                    "",
                    `Modo de cofre: ${modeLabel(config.mode)}`,
                    ...(config.mode === "tax"
                        ? [`Imposto: ${config.taxType === "percent" ? `${formatPercent(config.taxRateBasisPoints)} por 24h` : `${economy.formatMoney(config.taxFixedAmount)} por 24h`}, por hora completa após a primeira hora.`]
                        : []),
                    "",
                    "Como movimentar:",
                    `Depositar: ${prefix}cofre depositar <valor>`,
                    `Sacar: ${prefix}cofre sacar <valor>`
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
                result.taxPaid > 0 ? `Imposto descontado do saldo anterior: ${economy.formatMoney(result.taxPaid)} (${result.taxPeriods} hora(s) completa(s)).` : null,
                action === "withdraw" && result.shortfall > 0
                    ? `Valor solicitado: ${economy.formatMoney(result.requestedAmount)} · Sacado: ${economy.formatMoney(result.amount)}`
                    : null,
                `🏦 Cofre: ${economy.formatMoney(result.vaultBalance)}`
            ].filter(Boolean).join("\n")
        });
    }
};

function modeLabel(mode) {
    return ({ secure: "Impenetrável", tax: "Imposto", robbery: "Roubo permitido" })[mode] || mode;
}

function formatPercent(basisPoints) {
    return `${(basisPoints / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")}%`;
}

function formatHelp(prefix, config) {
    return [
        "🏦 COFRE",
        "Saldo e imposto são individuais; as regras são compartilhadas no grupo ou servidor.",
        "",
        "Consulte o cofre e as regras:",
        `${prefix}cofre`,
        "",
        "Tutorial — substitua <valor> pela quantia desejada:",
        `${prefix}cofre depositar <valor>`,
        `${prefix}cofre sacar <valor>`,
        "",
        `Modo de cofre: ${modeLabel(config.mode)}.`,
        ...(config.mode === "tax"
            ? [`Imposto: ${config.taxType === "percent" ? `${formatPercent(config.taxRateBasisPoints)} por 24h` : `${economy.formatMoney(config.taxFixedAmount)} por 24h`}, acumulado por hora completa após a primeira hora.`]
            : []),
        ...(config.mode === "robbery"
            ? [`Chance de o roubo atingir o cofre: ${config.robberyVaultChance}%.`]
            : []),
        `Um depósito e um saque por dia; mínimo por movimentação: ${economy.formatMoney(config.minimumMovement)}.`,
        `Use ${prefix}cofre help para rever estas instruções.`
    ].join("\n");
}

function normalizeAction(value) {
    const action = String(value || "").trim().toLowerCase();
    if (["depositar", "depósito", "deposito", "deposit", "guardar"].includes(action)) return "deposit";
    if (["sacar", "saque", "retirar", "retirada", "withdraw"].includes(action)) return "withdraw";
    return null;
}

function normalizeCommand(value) {
    return String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function parseAmount(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
    const [whole, cents = ""] = normalized.split(".");
    const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0"));
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
