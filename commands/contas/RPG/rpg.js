const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "rpg",
    category: "contas/RPG",
    description: "Exibe os comandos do RPG global.",
    usage: "!rpg",
    async execute(message) {
        const args = message.args || [];
        const action = String(args[0] || "menu").toLowerCase();
        const aliases = {
            personagens: "personagens",
            catalogo: "catalog",
            inicial: "initial",
            perfil: "perfil"
        };
        const actionArgs = args.slice(1);
        if (action === "inicial" && /^\d+$/.test(actionArgs[0] || "")) {
            actionArgs.unshift("escolher");
        }
        return rpgCommands.execute(message, aliases[action] || action, actionArgs);
    },
    async handleInteraction(interaction) {
        return rpgCommands.handleInteraction(interaction, ["rpg"]);
    }
};
