const activity = require("../../../functions/activity");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "atividade",
    aliases: ["atividadeconfig", "configatividade"],
    category: "adm/RP",
    description: "Controla o registro de atividade do grupo ou servidor: use `ativar` para começar a contabilizar mensagens, `desativar` para pausar ou `status` para conferir a configuração.",
    usage: "{prefix}atividade <ativar|desativar|status>",

    async execute(message) {
        if (!activity.load(message)) {
            return message.reply({ text: "❌ A atividade só funciona em grupos ou servidores." });
        }
        if (!message.sender?.isAdmin && !message.sender?.isOwner && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem ativar, desativar ou consultar a atividade." });
        }

        const action = String(message.args?.[0] || "status").toLowerCase();
        if (["ativar", "ativaratividade"].includes(action)) {
            activity.configure(message, true);
            return message.reply({ text: "✅ Sistema de atividade ativado. As próximas mensagens serão registradas." });
        }
        if (["desativar", "desativaratividade"].includes(action)) {
            activity.configure(message, false);
            return message.reply({ text: "✅ Sistema de atividade desativado. Os registros foram preservados." });
        }
        if (action === "status") {
            const data = activity.load(message);
            return message.reply({
                text: `📊 Atividade: ${data.enabled ? "ativada" : "desativada"}`
            });
        }
        return message.reply({
            text: `❌ Uso: ${message.prefix}atividade ativar|desativar|status`
        });
    }
};
