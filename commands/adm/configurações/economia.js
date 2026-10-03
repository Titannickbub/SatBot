const economy = require("../../../functions/economy");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "economia",
    aliases: ["configeconomia", "economy"],
    category: "adm/RP",
    description: "Liga, desliga ou consulta o estado da economia local do grupo ou servidor. Quando desativada, os comandos de saldo e atividades econômicas deixam de funcionar nesse contexto.",
    usage: "{prefix}economia <ativar|desativar|status>",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A economia só pode ser configurada em grupos ou servidores." });
        }
        if (!message.sender?.isAdmin && !message.sender?.isOwner && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem configurar a economia." });
        }

        const action = String(message.args?.[0] || "status").toLowerCase();
        if (["ativar", "ativada", "on", "enable"].includes(action)) {
            economy.setEnabled(message, true);
            return message.reply({ text: "✅ Economia ativada neste grupo/servidor." });
        }
        if (["desativar", "desativada", "off", "disable"].includes(action)) {
            economy.setEnabled(message, false);
            return message.reply({ text: "✅ Economia desativada neste grupo/servidor. Os saldos foram preservados." });
        }
        if (action === "status") {
            return message.reply({
                text: `💰 Economia: ${economy.isEnabled(message) ? "ativada" : "desativada"}`
            });
        }
        return message.reply({
            text: `❌ Uso: ${message.prefix}economia ativar|desativar|status`
        });
    }
};
