const battleCommands = require("../../../functions/rpgBattleCommands");

module.exports = {
    name: "desafiar",
    category: "contas/RPG",
    description: "Desafie alguém mencionando a pessoa ou respondendo à mensagem dela.",
    usage: "{prefix}desafiar [menção]",
    async execute(message) {
        return battleCommands.execute(message, "challenge");
    }
};
