const economy = require("../../../functions/economy");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `💰 Ativa ou desativa a economia deste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.
🪙 Quando ativada, os membros podem usar os comandos de saldo e atividades econômicas.
💾 Desativar a economia pausa esses comandos, mas preserva os saldos.

✅ Ativar:
{prefix}economia ativar

🔕 Desativar:
{prefix}economia desativar

📋 Consultar o estado:
{prefix}economia status

❔ Exibir esta ajuda:
{prefix}economia help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "economia",
    aliases: ["configeconomia", "economy"],
    category: "adm/RP",
    description: DESCRIPTION,
    usage: "{prefix}economia <ativar|desativar|status|help>",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A economia só pode ser configurada em grupos ou servidores." });
        }
        if (!message.sender?.isAdmin && !message.sender?.isOwner && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem configurar a economia." });
        }

        const action = String(message.args?.[0] || "status").toLowerCase();
        if (["help", "ajuda"].includes(action)) {
            return message.reply({ text: helpText(message) });
        }
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
            text: `❌ Uso: ${message.prefix}economia ativar|desativar|status|help`
        });
    }
};
