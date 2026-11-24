const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "rpgcatalogo",
    category: "contas/RPG",
    description: "Lista as bases do catálogo; escolha uma para ver seus personagens e abrir os cards.",
    usage: "!rpgcatalogo [página] | base <número> [página] | ver <id> [base <número> pagina <página>] | escolher <id>",
    async execute(message) {
        return rpgCommands.execute(message, "catalog", message.args || []);
    },
    async handleInteraction(interaction) {
        return rpgCommands.handleInteraction(interaction, ["rpgcatalogo"]);
    }
};
