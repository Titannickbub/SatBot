const battleCommands = require("../../../functions/rpgBattleCommands");

module.exports = {
    name: "desistir_desafio",
    category: "contas/RPG",
    description: "Desista da batalha atual e conceda a vitória ao oponente.",
    usage: "{prefix}desistir_desafio",
    async execute(message) {
        return battleCommands.execute(message, "surrender");
    }
};
