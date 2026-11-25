const battleCommands = require("../../../functions/rpgBattleCommands");

module.exports = {
    name: "equipe",
    category: "contas/RPG",
    description: "Organize de um a três personagens para as batalhas RPG.",
    usage: "{prefix}equipe <id1> [id2] [id3]",
    async execute(message) {
        return battleCommands.execute(message, "team");
    },
    async handleInteraction(interaction) {
        return battleCommands.handleInteraction(interaction);
    }
};
