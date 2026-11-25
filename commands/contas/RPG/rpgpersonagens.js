const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "meus_personagens",
    category: "contas/RPG",
    description: "Lista os personagens RPG que você possui.",
    usage: "{prefix}meus_personagens [página]",
    async execute(message) {
        return rpgCommands.execute(message, "personagens", message.args || []);
    },
    async handleInteraction(interaction) {
        return rpgCommands.handleInteraction(interaction, ["meus_personagens"]);
    }
};
