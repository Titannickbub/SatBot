const config = require("../functions/config");
const pkg = require("../package.json");

module.exports = {
    name: "infobot",
    aliases: ["sobre", "about", "dono", "info_bot", "botinfo", "bot_info", "bot-info"],
    category: null,
    description: "Exibe informações públicas sobre o bot, seu responsável e a base utilizada.",
    usage: "{prefix}infobot",

    async execute(message) {
        const info = typeof config.getBotInfo === "function" ? config.getBotInfo() : {};
        const botName = config.getBotName?.() || info.baseName || "Sat Bot";
        const contacts = Array.isArray(info.ownerContacts) && info.ownerContacts.length
            ? info.ownerContacts.map(contact => `• ${contact}`).join("\n")
            : "• Não informado";

        const text = [
            `🤖 *${botName}*`,
            info.description || "Bot multi-plataforma para sua comunidade.",
            `📦 Versão atual: ${pkg.version || "desconhecida"}`,
            "",
            "👤 *Responsável e contato:*",
            `• ${info.ownerName || "Não informado"}`,
            contacts,
            "",
            "🧩 *Base utilizada:*",
            `• ${info.baseName || botName}`,
            `• Desenvolvedor: ${info.baseDeveloper || "Não informado"}`,
            `• Repositório: ${info.baseRepository || "Não informado"}`,
            `• Licença: ${info.baseLicense || "Não informado"}`,
            "",
            `📌 Use *${message.prefix || "!"}menu* para ver os comandos disponíveis.`
        ].join("\n");

        return message.reply({ text });
    }
};
