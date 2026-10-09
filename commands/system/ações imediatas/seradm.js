const { setWhatsAppAdmin } = require("../../../functions/whatsappAdminHelper");

module.exports = {
    name: "seradm",
    category: "system/ações imediatas",
    description: `⚡ Promove imediatamente o usuário ou o próprio bot a administrador no grupo do WhatsApp.

🔐 Exclusivo para grupos do WhatsApp. Disponível apenas para superusuários / donos do bot.

📝 1. Execute o comando para se promover ou promover o bot a administrador:
{prefix}seradm

O bot utiliza as permissões do grupo para conceder status de administrador imediatamente.`,
    usage: "{prefix}seradm (promove o próprio bot)",

    async execute(message) {
        const result = await setWhatsAppAdmin(message, "promote", true);
        return message.reply({ text: result.text });
    }
};
