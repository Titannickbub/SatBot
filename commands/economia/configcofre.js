const economy = require("../../functions/economy");
const admin = require("../../functions/economyAdmin");

const MODE_ALIASES = new Map([
    ["impenetravel", "secure"],
    ["seguro", "secure"],
    ["segura", "secure"],
    ["imposto", "tax"],
    ["tributado", "tax"],
    ["roubo", "robbery"],
    ["roubavel", "robbery"]
]);

module.exports = {
    name: "configcofre",
    aliases: ["cofreconfig", "configurarcofre"],
    category: "adm/economia",
    description: "Configura o modo e as regras do cofre do grupo ou servidor.",
    usage: "{prefix}configcofre help",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
        }
        if (!admin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem configurar o cofre." });
        }

        const [rawAction, ...args] = message.args || [];
        const action = normalizeText(rawAction);
        const config = economy.getVaultConfig(message);
        if (!action || ["status", "estado"].includes(action)) {
            return message.reply({ text: formatStatus(config, message.prefix || "!") });
        }
        if (["help", "ajuda"].includes(action)) {
            return message.reply({ text: formatHelp(message.prefix || "!") });
        }

        if (action === "modo") {
            const mode = MODE_ALIASES.get(normalizeText(args[0]));
            if (!mode || args.length !== 1) {
                return message.reply({ text: `❌ Modo inválido. Use impenetravel, imposto ou roubo. Consulte ${message.prefix || "!"}configcofre help.` });
            }
            economy.updateVaultConfig(message, { mode });
            return message.reply({ text: `✅ Modo do cofre alterado para ${modeLabel(mode)}.` });
        }

        if (action === "minimo") {
            const minimumMovement = parseAmount(args[0]);
            if (minimumMovement === null || args.length !== 1) {
                return message.reply({ text: `❌ Informe o mínimo em SatCoins. Exemplo: ${message.prefix || "!"}configcofre minimo 500` });
            }
            economy.updateVaultConfig(message, { minimumMovement });
            return message.reply({ text: `✅ Valor mínimo de cada movimentação: ${economy.formatMoney(minimumMovement)}.` });
        }

        if (action === "imposto") {
            const type = normalizeText(args[0]);
            if (type === "percentual" || type === "porcentagem" || type === "porcentual") {
                const taxRateBasisPoints = parsePercent(args[1]);
                if (taxRateBasisPoints === null || args.length !== 2) {
                    return message.reply({ text: `❌ Informe uma porcentagem de 0 a 100. Exemplo: ${message.prefix || "!"}configcofre imposto percentual 1,5` });
                }
                economy.updateVaultConfig(message, { taxType: "percent", taxRateBasisPoints });
                return message.reply({ text: `✅ Imposto configurado em ${formatPercent(taxRateBasisPoints)} por período de 24 horas.` });
            }
            if (type === "fixo") {
                const taxFixedAmount = parseAmount(args[1]);
                if (taxFixedAmount === null || args.length !== 2) {
                    return message.reply({ text: `❌ Informe um valor fixo em SatCoins. Exemplo: ${message.prefix || "!"}configcofre imposto fixo 25` });
                }
                economy.updateVaultConfig(message, { taxType: "fixed", taxFixedAmount });
                return message.reply({ text: `✅ Imposto fixo configurado em ${economy.formatMoney(taxFixedAmount)} por período de 24 horas.` });
            }
            return message.reply({ text: `❌ Use imposto percentual <0-100> ou imposto fixo <valor>.` });
        }

        if (["chancecofre", "chance"].includes(action)) {
            const robberyVaultChance = Number(args[0]);
            if (!Number.isSafeInteger(robberyVaultChance) || robberyVaultChance < 0 ||
                robberyVaultChance > 100 || args.length !== 1) {
                return message.reply({ text: `❌ Informe a chance do cofre entre 0 e 100. Exemplo: ${message.prefix || "!"}configcofre chancecofre 40` });
            }
            economy.updateVaultConfig(message, { robberyVaultChance });
            return message.reply({ text: `✅ Chance de roubo do cofre: ${robberyVaultChance}%; carteira: ${100 - robberyVaultChance}%.` });
        }

        return message.reply({ text: `❌ Ação desconhecida. Consulte ${message.prefix || "!"}configcofre help.` });
    }
};

function formatStatus(config, prefix) {
    const tax = config.taxType === "percent"
        ? `${formatPercent(config.taxRateBasisPoints)} do saldo por 24h`
        : `${economy.formatMoney(config.taxFixedAmount)} por 24h`;
    return [
        "🏦 CONFIGURAÇÃO DO COFRE",
        `Modo: ${modeLabel(config.mode)}`,
        `Mínimo por movimentação: ${economy.formatMoney(config.minimumMovement)}`,
        `Imposto: ${tax}`,
        `Roubo: cofre ${config.robberyVaultChance}% · carteira ${100 - config.robberyVaultChance}%`,
        "",
        "Modos: impenetravel protege o cofre; imposto é calculado por hora completa após a primeira hora, proporcional à taxa configurada para 24h; roubo permite atingir cofre ou carteira.",
        `Configure: ${prefix}configcofre modo <impenetravel|imposto|roubo>`,
        `${prefix}configcofre minimo <valor>`,
        `${prefix}configcofre imposto <percentual <0-100>|fixo <valor>>`,
        `${prefix}configcofre chancecofre <0-100>`
    ].join("\n");
}

function formatHelp(prefix) {
    return [
        "⚙️ CONFIGURAÇÃO DO COFRE",
        "Disponível para administradores do grupo ou servidor.",
        "",
        "Consulte o estado:",
        `${prefix}configcofre status`,
        "",
        "Escolha o modo:",
        `${prefix}configcofre modo impenetravel`,
        `${prefix}configcofre modo imposto`,
        `${prefix}configcofre modo roubo`,
        "",
        "Defina o mínimo por movimentação:",
        `${prefix}configcofre minimo 500`,
        "",
        "Configure o imposto (percentual por período ou valor fixo):",
        `${prefix}configcofre imposto percentual 1,5`,
        `${prefix}configcofre imposto fixo 25`,
        "",
        "Defina a chance de o roubo atingir o cofre (a carteira recebe o restante até 100%):",
        `${prefix}configcofre chancecofre 40`,
        "",
        "O imposto configurado por 24 horas é acumulado proporcionalmente por hora completa desde a última movimentação. A primeira hora não gera cobrança."
    ].join("\n");
}

function modeLabel(mode) {
    return ({
        secure: "Impenetrável",
        tax: "Imposto progressivo",
        robbery: "Roubo permitido"
    })[mode];
}

function normalizeText(value) {
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
    return Number.isSafeInteger(amount) ? amount : null;
}

function parsePercent(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim().replace(",", ".");
    if (!/^(?:\d{1,3})(?:\.\d{1,2})?$/.test(normalized)) return null;
    const [whole, decimals = ""] = normalized.split(".");
    const basisPoints = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
    return basisPoints <= 10000 ? basisPoints : null;
}

function formatPercent(basisPoints) {
    return `${(basisPoints / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")}%`;
}
