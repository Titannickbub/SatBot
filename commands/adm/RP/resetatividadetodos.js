const activity = require("../../../functions/activity");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `♻️ Apaga os registros de atividade de todos os membros deste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.
⚠️ Esta ação remove todo o ranking de atividade do chat e não pode ser desfeita. Ela não desativa o registro de novas mensagens.

🧹 Apague os registros de todos os membros:
{prefix}resetatividadetodos

❔ Exiba esta ajuda:
{prefix}resetatividadetodos help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "resetatividadetodos",
    aliases: ["zeraratividadetodos", "resetatividadegrupo"],
    category: "adm/RP",
    description: DESCRIPTION,
    usage: "{prefix}resetatividadetodos [help]",
    examples: [
        "{prefix}resetatividadetodos",
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

        const count = activity.resetAll(message);
        return message.reply({
            text: `✅ Atividade do grupo/servidor resetada. ${count} usuário(s) removido(s) do ranking.`
        });
    }
};
