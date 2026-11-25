const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "rpg",
    category: "contas/RPG",
    description: "Exibe seu perfil e progresso global no RPG.",
    usage: "{prefix}rpg",
    async execute(message) {
        return rpgCommands.execute(message, "perfil");
    },
    async handleInteraction(interaction) {
        return rpgCommands.handleInteraction(interaction, ["rpg"]);
    }
};
