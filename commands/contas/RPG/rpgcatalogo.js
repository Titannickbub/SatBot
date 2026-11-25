const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "catalogo",
    category: "contas/RPG",
    description: "Consulta o catálogo de personagens RPG e permite escolher seu personagem inicial.",
    usage: "!catalogo [help|página] | base <número> [página] | ver <id> base <número> pagina <página> | escolher <id>",
    async execute(message) {
        return rpgCommands.execute(message, "catalog", message.args || []);
    },
    async handleInteraction(interaction) {
        return rpgCommands.handleInteraction(interaction, ["catalogo"]);
    }
};
