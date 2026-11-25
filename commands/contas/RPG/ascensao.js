const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "ascensao",
    category: "contas/RPG",
    description: "Consulta seus pontos de Ascensão e usa um ponto para evoluir um personagem.",
    usage: "{prefix}ascensao [ID do personagem]",
    async execute(message) {
        return rpgCommands.execute(message, "ascensao", message.args || []);
    }
};
