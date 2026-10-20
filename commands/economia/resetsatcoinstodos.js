const economy = require("../../functions/economy");
const economyAdmin = require("../../functions/economyAdmin");

const DESCRIPTION = `♻️ Zera os saldos de satcoins de todas as contas registradas neste grupo ou servidor. Os demais dados das contas são preservados.

🔐 Disponível para administradores do chat e superusuários.
⚠️ Esta ação não pode ser desfeita. O comando sem confirmação apenas exibe este aviso.

🧹 Confirme o reset dos saldos de todos os membros:
{prefix}resetsatcoinstodos true

❔ Exiba esta ajuda:
{prefix}resetsatcoinstodos help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "resetsatcoinstodos",
    aliases: ["resetcoinstodos", "zerarsatcoinstodos", "zerarcoinstodos", "resetsatcoinsgrupo"],
    category: "adm/economia",
    description: DESCRIPTION,
    usage: "{prefix}resetsatcoinstodos <true|help>",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A economia só funciona em grupos ou servidores." });
        }
        if (!economyAdmin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem resetar saldos de satcoins." });
        }
        if (["help", "ajuda"].includes(String(message.args?.[0] || "").toLowerCase())) {
            return message.reply({ text: helpText(message) });
        }
        if (String(message.args?.[0] || "").toLowerCase() !== "true") {
            return message.reply({
                text: `⚠️ Este comando zerará permanentemente os saldos de satcoins de todos os membros. Para confirmar, envie ${message.prefix}${message.command} true.`
            });
        }

        const count = economy.resetAllBalances(message);
        if (count === null) {
            return message.reply({ text: "❌ Não foi possível resetar os saldos deste grupo/servidor." });
        }
        return message.reply({ text: `✅ Saldos de todos os membros zerados. ${count} conta(s) atualizada(s).` });
    }
};
