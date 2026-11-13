const act = require("./act");
const act18Permissions = require("../../functions/act18Permissions");

module.exports = {
    ...act,
    name: "act18",
    aliases: [],
    category: "diversão/Ações adultas",
    description: `${act.description
        .replaceAll("{prefix}act", "{prefix}act18")}

🔞 Disponível somente em chats com permissão adulta da plataforma.`,
    usage: "{prefix}act18 help",
    getMenuUsage(message) {
        return act18Permissions.isAllowed(message)
            ? act.getMenuUsage(message, "adult")
            : "{prefix}act18 <ação> [@membro]";
    },
    resolveAlias(commandName, message) {
        return act.resolveAlias(commandName, message, "adult");
    },
    info(message) {
        return act.info(message, "adult");
    },
    async execute(message) {
        if (!act18Permissions.isAllowed(message)) {
            return message.reply({ text: act18Permissions.denialText(message) });
        }
        return act.execute(message, "adult");
    }
};
