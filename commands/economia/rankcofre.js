const economy = require("../../functions/economy");
const admin = require("../../functions/economyAdmin");

module.exports = {
    name: "rankcofre",
    aliases: ["cofrerank", "cofrenorank"],
    category: "adm/economia",
    description: `🏆 Ativa ou desativa a inclusão do cofre nos rankings de riqueza deste grupo/servidor.

🔐 Apenas administradores podem usar este comando.

📝 Consulte ou altere:
{prefix}rankcofre
{prefix}rankcofre on
{prefix}rankcofre off`,
    usage: "{prefix}rankcofre [on|off]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
        }
        if (!admin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem alterar o cofre nos rankings." });
        }

        const [rawValue, ...extra] = message.args || [];
        if (extra.length) return message.reply({ text: `❌ Uso: ${message.prefix || "!"}rankcofre [on|off]` });
        const value = String(rawValue || "").trim().toLowerCase();
        if (["on", "ativar", "sim", "true"].includes(value)) {
            economy.setIncludeVaultInRanking(message, true);
        } else if (["off", "desativar", "nao", "não", "false"].includes(value)) {
            economy.setIncludeVaultInRanking(message, false);
        } else if (value) {
            return message.reply({ text: `❌ Use on ou off. Exemplo: ${message.prefix || "!"}rankcofre on` });
        }

        const enabled = economy.getIncludeVaultInRanking(message);
        return message.reply({
            text: `🏆 Cofre ${enabled ? "incluído no" : "fora do"} ranking de riqueza.`
        });
    }
};
