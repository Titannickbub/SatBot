const owners = require("../../functions/owners");
const config = require("../../functions/config");

module.exports = {
    name: "botname",
    aliases: ["setbotname", "nomebot"],
    category: "system",
    description: "Consulta ou altera o nome usado pelo bot e pela IA no modo de menção. Uso exclusivo de Super Usuários.",
    usage: "{prefix}botname [novo nome]",
    examples: [
        "{prefix}botname",
        "{prefix}botname Novo Nome"
    ],

    async execute(message) {
        if (!owners.isOwner(message)) {
            return message.reply({ text: "❌ Apenas Super Usuários podem consultar ou alterar o nome do bot." });
        }

        const name = (message.args || []).join(" ").trim();
        if (!name) {
            return message.reply({
                text: `🤖 Nome atual do bot: *${config.getBotName()}*\n\nPara alterar: ${message.prefix || "!"}botname <novo nome>`
            });
        }

        const updatedName = config.setBotName(name);
        return message.reply({
            text: `✅ Nome do bot alterado para *${updatedName}*.\nA IA e o modo de menção usarão esse nome imediatamente.`
        });
    }
};
