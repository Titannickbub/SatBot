const xp = require("../../../functions/xp");
const xpAdmin = require("../../../functions/xpAdmin");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `♻️ Zera o XP de um membro neste grupo ou servidor, mantendo o membro registrado.

🔐 Disponível para administradores do chat e superusuários.
⚠️ A alteração não pode ser desfeita. O comando sem confirmação apenas exibe este aviso.

👤 Resete respondendo à mensagem do membro ou informando uma menção/ID:
{prefix}resetxp true @usuário
{prefix}resetxp true <id>
{prefix}resetxp true (respondendo à mensagem do membro)

❔ Exiba esta ajuda:
{prefix}resetxp help`;

function isAdmin(message) {
    return Boolean(message.sender?.isAdmin || message.sender?.isOwner || isOwner(message));
}

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "resetxp",
    aliases: ["zerarxp", "resetarxp"],
    category: "adm/xp",
    description: DESCRIPTION,
    usage: "{prefix}resetxp help",

    async execute(message) {
        const data = xp.load(message);
        if (!data) return message.reply({ text: "❌ O XP só funciona em grupos ou servidores." });
        if (!isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem resetar o XP." });
        }
        if (["help", "ajuda"].includes(String(message.args?.[0] || "").toLowerCase())) {
            return message.reply({ text: helpText(message) });
        }
        if (String(message.args?.[0] || "").toLowerCase() !== "true") {
            return message.reply({
                text: `⚠️ Este comando zerará permanentemente o XP de um membro. Para confirmar, use ${message.prefix}${message.command} true respondendo à mensagem dele ou informando o ID.`
            });
        }

        const targetArgument = message.args.slice(1).join(" ").trim();
        const target = xpAdmin.resolveTarget(message, targetArgument);
        if (!target) {
            return message.reply({ text: "❌ Usuário não encontrado no ranking de XP. Informe um membro registrado após true ou responda à mensagem dele." });
        }

        const resetUser = xp.resetUser(message, target.userId);
        if (!resetUser) {
            return message.reply({ text: "❌ Não foi possível resetar o XP deste membro." });
        }
        return message.reply({
            text: `✅ XP de ${resetUser.displayName || resetUser.username || resetUser.userId} zerado.`
        });
    }
};
