const config = require("../functions/config");

module.exports = {
    name: "dono",
    aliases: ["owner", "quemedono"],
    category: null,
    description: `👤 Exibe o responsável pelo bot e seus contatos.

🔐 O superusuário configura essas informações com {prefix}setbotinfo.

📌 Uso:
{prefix}dono`,
    usage: "{prefix}dono",

    async execute(message) {
        const info = config.getBotInfo();
        const contacts = info.ownerContacts.length
            ? info.ownerContacts.map(contact => `• ${contact}`).join("\n")
            : "• Nenhum contato configurado.";
        const text = [
            "👤 *Responsável pelo bot:*",
            `• ${info.ownerName || "Não informado"}`,
            "",
            "📞 *Contato:*",
            contacts
        ].join("\n");
        return message.reply({ text });
    }
};
