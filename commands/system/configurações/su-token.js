const authFlow = require("../../../functions/authFlow");

module.exports = {
    name: "su-token",
    category: "system/configurações",
    description: "Adiciona tokens de plataformas restantes e reinicia o bot para aplicar a configuração.",
    usage: "{prefix}su token <discord|telegram> <token>",
    examples: [
        "{prefix}su token telegram 123456:ABCDEF",
        "{prefix}su token discord TOKEN"
    ],

    async execute(message) {
        const owners = message.functions?.owners;
        if (!owners?.isOwner(message)) {
            return message.reply({ text: "❌ Apenas super usuários podem usar este comando." });
        }

        const args = message.args || [];
        let platform = "";
        let token = "";

        if (args[0] && args[0].toLowerCase() === "token") {
            platform = (args[1] || "").toLowerCase();
            token = (args.slice(2).join(" ") || "").trim();
        } else {
            platform = (args[0] || "").toLowerCase();
            token = (args.slice(1).join(" ") || "").trim();
        }

        if (!platform || !token) {
            return message.reply({ text: `❌ Uso: ${message.prefix}su token <discord|telegram> <token>` });
        }

        if (!["discord", "telegram"].includes(platform)) {
            return message.reply({
                text: `❌ Plataforma inválida. Para WhatsApp, use ${message.prefix}su whatsapp qr ou ${message.prefix}su whatsapp codigo <número>.`
            });
        }

        authFlow.writePlatformToken(platform, token);
        await message.reply({ text: `✅ Token de ${platform} registrado.` });

        const configFn = message.functions.config || require("../../../functions/config");
        const botName = typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot";
        await message.reply({ text: `🔄 Reiniciando ${botName} para aplicar a configuração...` });
        setTimeout(() => process.exit(0), 1000);
    }
};
