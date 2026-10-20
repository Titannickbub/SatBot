const economy = require("../../functions/economy");
const economyAdmin = require("../../functions/economyAdmin");

const DESCRIPTION = `♻️ Zera somente o saldo de satcoins de um membro neste grupo ou servidor. Os demais dados da conta são preservados.

🔐 Disponível para administradores do chat e superusuários.
⚠️ A alteração não pode ser desfeita. O comando sem confirmação apenas exibe este aviso.

👤 Resete respondendo à mensagem do membro ou informando uma menção/ID:
{prefix}resetsatcoins true @usuário
{prefix}resetsatcoins true <id>
{prefix}resetsatcoins true (respondendo à mensagem do membro)

❔ Exiba esta ajuda:
{prefix}resetsatcoins help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "resetsatcoins",
    aliases: ["resetcoins", "zerarsatcoins", "zerarcoins"],
    category: "adm/economia",
    description: DESCRIPTION,
    usage: "{prefix}resetsatcoins true <id|@usuário|help>",

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
                text: `⚠️ Este comando zerará permanentemente o saldo de satcoins de um membro. Para confirmar, use ${message.prefix}${message.command} true respondendo à mensagem dele ou informando o ID.`
            });
        }

        const targetArgument = message.args.slice(1).join(" ").trim();
        const target = economyAdmin.resolveTarget(message, targetArgument);
        if (!target) {
            return message.reply({ text: "❌ Usuário não encontrado. Informe um membro após true ou responda à mensagem dele." });
        }
        const account = economy.resetBalance(message, target.userId);
        if (!account) {
            return message.reply({ text: "❌ Este membro não possui uma conta de economia registrada neste grupo/servidor." });
        }
        return message.reply({
            text: `✅ Saldo de ${account.displayName || account.username || account.userId} zerado.`
        });
    }
};
