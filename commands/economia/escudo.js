const economy = require("../../functions/economy");
const imageBanner = require("../../functions/imageBanner");

module.exports = {
    name: "escudo",
    aliases: ["shield"],
    category: "economia",
    description: `🛡️ Veja em um banner o estado e as cargas do seu escudo anti-roubo neste grupo ou servidor.

📝 Uso:
{prefix}escudo

Cada escudo começa com cinco cargas. Cada tentativa de roubo bloqueada consome uma carga; quando elas acabam, o escudo deixa de proteger. Para comprar outro, use {prefix}comprar escudo (é necessário ter saldo mínimo de 500,00 SatCoins).`,
    usage: "{prefix}escudo",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O escudo só funciona em grupos ou servidores." });
        }

        try {
            const result = await imageBanner.renderShieldBanner(message);
            if (result.error) return message.reply({ text: `❌ ${result.error}` });
            return message.replyImg({
                image: result.buffer,
                caption: result.caption,
                fileName: "escudo.png"
            });
        } catch (error) {
            console.error("[ESCUDO] Não foi possível gerar o banner do escudo:", error.message || error);
            return message.reply({ text: "❌ Não foi possível consultar o estado do escudo agora." });
        }
    }
};
