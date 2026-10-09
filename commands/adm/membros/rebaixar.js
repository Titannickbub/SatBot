const { setWhatsAppAdmin } = require("../../../functions/whatsappAdminHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "rebaixar",
    category: "adm/membros",
    platformSupport: {
        whatsapp: "full",
        telegram: "none",
        discord: "none"
    },
    description: `⬇️ Rebaixa um administrador para membro no grupo do WhatsApp.

🔐 Você e o bot precisam ser administradores do grupo.

📌 Informe o membro por resposta, menção, número/ID ou ID central:
{prefix}rebaixar <número|ID central|@menção>

💡 Exemplos:
{prefix}rebaixar 5511999999999
{prefix}rebaixar @membro

Também é possível responder à mensagem do administrador com o comando.`,
    usage: "{prefix}rebaixar <ID|ID central|@menção> ou responda à mensagem",
    examples: [
        "{prefix}rebaixar 5511999999999",
        "{prefix}rebaixar @membro",
        "Responda à mensagem do administrador com {prefix}rebaixar"
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
        const result = await setWhatsAppAdmin(message, "demote");
        return message.reply({ text: result.text });
    }
};
