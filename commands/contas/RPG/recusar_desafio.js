const battleCommands = require("../../../functions/rpgBattleCommands");

module.exports = {
    name: "recusar_desafio",
    category: "contas/RPG",
    description: "Recuse um desafio pendente neste grupo ou servidor.",
    usage: "{prefix}recusar_desafio",
    async execute(message) {
        return battleCommands.execute(message, "decline");
    }
};
