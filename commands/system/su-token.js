const authFlow = require("../../functions/authFlow");

module.exports = {
    name: "su-token",
    category: "system",
    description: "Adiciona tokens de plataformas restantes e reinicia o bot para aplicar a configuração.",
    usage: "{prefix}su token <discord|telegram|whatsapp> <token>",
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
            return message.reply({ text: "❌ Uso: !su token <discord|telegram|whatsapp> <token>" });
        }

        if (!["discord", "telegram", "whatsapp"].includes(platform)) {
            return message.reply({ text: "❌ Plataforma inválida. Use discord, telegram ou whatsapp." });
        }

        if (platform === "whatsapp") {
            authFlow.writePlatformToken(platform, token);
            await message.reply({ text: "✅ Token de WhatsApp registrado. O QR será exibido no próximo boot." });
        } else {
            authFlow.writePlatformToken(platform, token);
            await message.reply({ text: `✅ Token de ${platform} registrado.` });
        }

        await message.reply({ text: "🔄 Reiniciando Satella para aplicar a configuração..." });
        setTimeout(() => process.exit(0), 1000);
    }
};
