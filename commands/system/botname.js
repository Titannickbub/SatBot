const owners = require("../../functions/owners");
const config = require("../../functions/config");

const DESCRIPTION = `🤖 Consulta ou altera o nome público exibido pelo bot e utilizado pela inteligência artificial.

🔐 Disponível apenas para superusuários / donos do bot.

🔍 1. Consultar o nome atual:
{prefix}botname

✏️ 2. Alterar o nome do bot:
{prefix}botname Satela
{prefix}botname Sat Bot

ℹ️ A alteração é aplicada imediatamente em menus, menções e respostas da IA.`;

module.exports = {
    name: "botname",
    aliases: ["setbotname", "nomebot"],
    category: "system",
    description: DESCRIPTION,
    usage: "{prefix}botname [novo nome]",
    examples: [
        "{prefix}botname",
        "{prefix}botname Satela",
        "{prefix}botname Sat Bot"
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
