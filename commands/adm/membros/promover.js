const { setWhatsAppAdmin } = require("../../../functions/whatsappAdminHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "promover",
    category: "adm/membros",
    platformSupport: {
        whatsapp: "full",
        telegram: "none",
        discord: "none"
    },
    description: `⬆️ Promove um membro a administrador do grupo no WhatsApp.

🔐 Você e o bot precisam ser administradores do grupo.

📌 Informe o membro por resposta, menção, número/ID ou ID central:
{prefix}promover <número|ID central|@menção>

💡 Exemplos:
{prefix}promover 5511999999999
{prefix}promover @membro

Também é possível responder à mensagem do membro com o comando.`,
    usage: "{prefix}promover <ID|ID central|@menção> ou responda à mensagem",
    examples: [
        "{prefix}promover 5511999999999",
        "{prefix}promover @membro",
        "Responda à mensagem do membro com {prefix}promover"
    ],

    async execute(message) {
        if (message.platform !== "whatsapp") {
            return message.reply({ text: "❌ Este comando é exclusivo do WhatsApp." });
        }
        const adapter = (message.platforms || []).find((platform) => platform.name === "whatsapp");
        const userOk = isOwner(message) || (adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin);
        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores do grupo podem usar este comando." });
        }
        const result = await setWhatsAppAdmin(message, "promote");
        return message.reply({ text: result.text });
    }
};
