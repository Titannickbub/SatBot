const { setWhatsAppAdmin } = require("../../../functions/whatsappAdminHelper");

module.exports = {
    name: "seradm",
    category: "system/ações imediatas",
    description: "Promove um membro a administrador no WhatsApp. Exclusivo do superusuário do bot.",
    usage: "{prefix}seradm (promove o próprio bot)",

    async execute(message) {
        const result = await setWhatsAppAdmin(message, "promote", true);
        return message.reply({ text: result.text });
    }
};
