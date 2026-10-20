const activity = require("../../../functions/activity");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `♻️ Apaga os registros de atividade de todos os membros deste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.
⚠️ Esta ação remove todo o ranking de atividade do chat e não pode ser desfeita. Ela não desativa o registro de novas mensagens.

🧹 Apague os registros de todos os membros confirmando com true:
{prefix}resetatividadetodos true

❔ Exiba esta ajuda:
{prefix}resetatividadetodos help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "resetatividadetodos",
    aliases: ["zeraratividadetodos", "resetatividadegrupo"],
    category: "adm/atividade",
    description: DESCRIPTION,
    usage: "{prefix}resetatividadetodos <true|help>",
    examples: [
        "{prefix}resetatividadetodos true",
        "{prefix}resetatividadetodos help"
    ],

    async execute(message) {
        if (!activity.load(message)) {
            return message.reply({ text: "❌ A atividade só funciona em grupos ou servidores." });
        }
        if (!message.sender?.isAdmin && !message.sender?.isOwner && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem resetar a atividade." });
        }

        if (["help", "ajuda"].includes(String(message.args?.[0] || "").toLowerCase())) {
            return message.reply({ text: helpText(message) });
        }

        if (String(message.args?.[0] || "").toLowerCase() !== "true") {
            return message.reply({
                text: `⚠️ Este comando apagará permanentemente a atividade de todos os membros. Para confirmar, envie ${message.prefix}${message.command} true.`
            });
        }

        const count = activity.resetAll(message);
        if (count === null) {
            return message.reply({ text: "❌ Não foi possível resetar a atividade deste grupo/servidor." });
        }
        return message.reply({
            text: `✅ Atividade do grupo/servidor resetada. ${count} usuário(s) removido(s) do ranking.`
        });
    }
};
