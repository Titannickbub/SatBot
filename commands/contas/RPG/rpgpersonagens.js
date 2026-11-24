const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "rpgpersonagens",
    category: "contas/RPG",
    description: "Lista seus personagens RPG em páginas de até 10.",
    usage: "!rpgpersonagens [página]",
    async execute(message) {
        return rpgCommands.execute(message, "personagens", message.args || []);
    },
    async handleInteraction(interaction) {
        return rpgCommands.handleInteraction(interaction, ["rpgpersonagens"]);
    }
};
