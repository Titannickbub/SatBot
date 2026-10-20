const xp = require("../../../functions/xp");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `♻️ Zera o XP de todos os membros registrados neste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.
⚠️ Esta ação não pode ser desfeita. O comando sem confirmação apenas exibe este aviso.

🧹 Confirme o reset de XP de todos os membros:
{prefix}resetxptodos true

❔ Exiba esta ajuda:
{prefix}resetxptodos help`;

function isAdmin(message) {
    return Boolean(message.sender?.isAdmin || message.sender?.isOwner || isOwner(message));
}

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "resetxptodos",
    aliases: ["zerarxptodos", "resetxpgrupo"],
    category: "adm/xp",
    description: DESCRIPTION,
    usage: "{prefix}resetxptodos <true|help>",

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
                text: `⚠️ Este comando zerará permanentemente o XP de todos os membros registrados. Para confirmar, envie ${message.prefix}${message.command} true.`
            });
        }

        const count = xp.resetAll(message);
        if (count === null) {
            return message.reply({ text: "❌ Não foi possível resetar o XP deste grupo/servidor." });
        }
        return message.reply({ text: `✅ XP de todos os membros resetado. ${count} membro(s) atualizado(s).` });
    }
};
