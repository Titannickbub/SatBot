const { setWhatsAppAdmin } = require("../../../functions/whatsappAdminHelper");

module.exports = {
    name: "rebaixar",
    category: "adm/membros",
    platformSupport: {
        whatsapp: "full",
        telegram: "none",
        discord: "none"
    },
    description: "Rebaixa um administrador para membro no WhatsApp. Pode usar resposta, ID, ID central ou menção.",
    usage: "{prefix}rebaixar <ID|ID central|@menção> ou responda à mensagem",

    async execute(message) {
        if (message.platform !== "whatsapp") {
            return message.reply({ text: "❌ Este comando é exclusivo do WhatsApp." });
        }
        const adapter = (message.platforms || []).find((platform) => platform.name === "whatsapp");
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;
        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores do grupo podem usar este comando." });
        }
        const result = await setWhatsAppAdmin(message, "demote");
        return message.reply({ text: result.text });
    }
};
