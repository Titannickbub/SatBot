const battleCommands = require("../../../functions/rpgBattleCommands");

module.exports = {
    name: "status_batalha",
    category: "contas/RPG",
    description: "Consulte o estado da batalha ou convites pendentes.",
    usage: "{prefix}status_batalha",
    async execute(message) {
        return battleCommands.execute(message, "status");
    }
};
