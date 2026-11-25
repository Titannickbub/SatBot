const battleCommands = require("../../../functions/rpgBattleCommands");

module.exports = {
    name: "aceitar_desafio",
    category: "contas/RPG",
    description: "Aceite um desafio pendente neste grupo ou servidor.",
    usage: "{prefix}aceitar_desafio",
    async execute(message) {
        return battleCommands.execute(message, "accept");
    }
};
