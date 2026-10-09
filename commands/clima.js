const weatherMonitor = require("../functions/weatherMonitor");

module.exports = {
    name: "clima",
    aliases: ["tempo", "weather"],
    description: `🌦️ Consulta a previsão do tempo atual para uma cidade.

🕒 Também temos monitor do clima estático em {prefix}monitorclima
🎲 e monitor do clima com cidades aleatórias em {prefix}rclima

📌 Uso:
{prefix}clima [cidade]

📍 Exemplos:
{prefix}clima Mutum
{prefix}clima São Paulo`,
    usage: "{prefix}clima [cidade]",
    examples: ["{prefix}clima Mutum", "{prefix}clima São Paulo"],

    async execute(message) {
        const city = (message.args || []).join(" ").trim();
        if (!city || ["help", "ajuda"].includes(city.toLowerCase())) {
            return message.reply({ text: _help(message) });
        }

        if (["set", "times", "enable", "disable", "ativar", "desativar", "on", "off", "status", "run"].includes(city.split(/\s+/)[0].toLowerCase())) {
            const prefix = message.prefix || "!";
            return message.reply({
                text: `ℹ️ A consulta de clima e o monitor agendado agora são comandos separados.\n\n• Consulte uma cidade com *${prefix}clima <cidade>*.\n• Gerencie os envios automáticos com *${prefix}monitorclima*.`
            });
        }

        await message.reply({ text: "☁️ Consultando previsão do tempo, aguarde..." });
        try {
            const result = await weatherMonitor.runWeatherReport({ city, send: false });
            if (result.error) {
                return message.reply({ text: "⚠️ O serviço de previsão do tempo está indisponível ou instável no momento. Tente novamente em alguns minutos." });
            }
            return message.reply({ text: result.text });
        } catch (err) {
            console.error("[CLIMA] Erro ao consultar previsão:", err.message || err);
            return message.reply({ text: "⚠️ O serviço de previsão do tempo está indisponível ou instável no momento. Tente novamente em alguns minutos." });
        }
    }
};

function _help(message) {
    const prefix = message.prefix || "!";
    return [
        "🌦️ *CLIMA — AJUDA*",
        "",
        "🏙️ Consulta a previsão do tempo atual para uma cidade.",
        "",
        `🌤️ \`${prefix}clima [cidade]\` — Busca a previsão imediata.`,
        "",
        `🕒 \`${prefix}monitorclima\` — Configura o monitor do clima estático.`,
        `🎲 \`${prefix}rclima\` — Configura o monitor do clima com cidades aleatórias.`,
        "",
        `📍 Exemplos: \`${prefix}clima Mutum\` e \`${prefix}clima São Paulo\`.`
    ].join("\n");
}
