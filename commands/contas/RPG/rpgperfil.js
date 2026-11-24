const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "rpgperfil",
    category: "contas/RPG",
    description: "Consulta o perfil e o progresso global do RPG.",
    usage: "!rpgperfil",
    async execute(message) {
        return rpgCommands.execute(message, "perfil");
    }
};
