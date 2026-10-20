const { setWhatsAppAdmin } = require("../../../functions/whatsappAdminHelper");

module.exports = {
    name: "sermb",
    category: "system/ações imediatas",
    description: `⚡ Rebaixa imediatamente o administrador para membro comum no grupo do WhatsApp.

🔐 Exclusivo para grupos do WhatsApp. Disponível apenas para superusuários / donos do bot.

📝 1. Execute o comando para rebaixar o status de administrador:
{prefix}sermb

O bot remove os privilégios administrativos no grupo do WhatsApp, retornando o status para membro comum.`,
    usage: "{prefix}sermb (rebaixa o próprio bot)",

    async execute(message) {
        const result = await setWhatsAppAdmin(message, "demote", true);
        return message.reply({ text: result.text });
    }
};
