const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "rpginicial",
    category: "contas/RPG",
    description: "Abre a lista de bases do catálogo para consultar personagens e escolher o inicial.",
    usage: "!rpginicial [página]",
    async execute(message) {
        return rpgCommands.execute(message, "initial", message.args || []);
    },
    async handleInteraction(interaction) {
        return rpgCommands.handleInteraction(interaction, ["rpginicial"]);
    }
};
