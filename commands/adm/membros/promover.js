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
    description: "Promove um membro a administrador no WhatsApp. Pode usar resposta, ID, ID central ou menção.",
    usage: "{prefix}promover <ID|ID central|@menção> ou responda à mensagem",

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
