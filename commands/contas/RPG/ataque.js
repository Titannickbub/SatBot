const battleCommands = require("../../../functions/rpgBattleCommands");

module.exports = {
    name: "ataque",
    category: "contas/RPG",
    description: "Use um golpe pelo nome ou pelo ID.",
    usage: "{prefix}ataque <nome ou id do golpe>",
    async execute(message) {
        return battleCommands.execute(message, "attack");
    }
};
