const authFlow = require("../../../functions/authFlow");

const DESCRIPTION = `🔑 Configura o token de autenticação para plataformas suportadas (Discord e Telegram) e reinicia o bot para aplicar as alterações.

🔐 Disponível apenas para superusuários / donos do bot.

🤖 1. Configure o token do Discord:
{prefix}su token discord SEU_TOKEN_AQUI

✈️ 2. Configure o token do Telegram:
{prefix}su token telegram 123456:ABCDEF_SEU_TOKEN

ℹ️ Para conectar ao WhatsApp, utilize:
• {prefix}su whatsapp qr (via QR Code)
• {prefix}su whatsapp codigo <número> (via código de pareamento)

🔄 Após registrar o token, o bot será reiniciado automaticamente para iniciar a conexão na plataforma.`;

module.exports = {
    name: "su-token",
    category: "system/configurações",
    description: DESCRIPTION,
    usage: "{prefix}su token <discord|telegram> <token>",
    examples: [
        "{prefix}su token discord SEU_TOKEN_AQUI",
        "{prefix}su token telegram 123456:ABCDEF_SEU_TOKEN"
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
