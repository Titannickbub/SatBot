const alugar = require("../alugar");
const { isOwner } = require("../../functions/owners");

function isSuperUser(message) {
    return Boolean(message.sender?.isOwner || isOwner(message));
}

module.exports = {
    name: "alugarsu",
    aliases: ["modoaluguel", "alugar_su"],
    category: "system/configurações",
    description: "Administre pedidos, pagamentos e assinaturas de aluguel.",
    usage: "{prefix}alugar_su help",
    getMenuUsage() {
        return "{prefix}alugarsu help";
    },
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },

    async handleInteraction(interaction) {
        return alugar.handleInteraction(interaction);
    },

    async execute(message) {
        if (!isSuperUser(message)) {
            return message.reply({ text: "❌ Somente o superusuário pode usar este comando." });
        }
        try {
            return await alugar.executeSuperUser(message);
        } catch (error) {
            return message.reply({ text: `❌ ${error.message || "Não foi possível concluir o comando."}` });
        }
    }
};
