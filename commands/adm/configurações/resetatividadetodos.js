const activity = require("../../../functions/activity");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "resetatividadetodos",
    aliases: ["zeraratividadetodos", "resetatividadegrupo"],
    category: "adm/RP",
    description: "Zera toda a atividade do grupo ou servidor.",
    usage: "{prefix}resetatividadetodos",

    async execute(message) {
        if (!activity.load(message)) {
            return message.reply({ text: "❌ A atividade só funciona em grupos ou servidores." });
        }
        if (!message.sender?.isAdmin && !message.sender?.isOwner && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem resetar a atividade." });
        }

        const count = activity.resetAll(message);
        return message.reply({
            text: `✅ Atividade do grupo/servidor resetada. ${count} usuário(s) removido(s) do ranking.`
        });
    }
};
