const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "rpgver",
    category: "contas/RPG",
    description: "Exibe o card de um personagem pelo ID ou nome.",
    usage: "{prefix}rpgver <id ou nome>",
    async execute(message) {
        return rpgCommands.execute(message, "view", message.args || []);
    }
};
