const { setWhatsAppAdmin } = require("../../../functions/whatsappAdminHelper");

module.exports = {
    name: "sermb",
    category: "system/ações imediatas",
    description: "Rebaixa um administrador para membro no WhatsApp. Exclusivo do superusuário do bot.",
    usage: "{prefix}sermb (rebaixa o próprio bot)",

    async execute(message) {
        const result = await setWhatsAppAdmin(message, "demote", true);
        return message.reply({ text: result.text });
    }
};
