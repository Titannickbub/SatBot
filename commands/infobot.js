const config = require("../functions/config");
const pkg = require("../package.json");

function getActivePlatforms() {
    const connected = {
        whatsapp: Boolean(global.whatsappSock?.user),
        telegram: Boolean(global.telegramBot?.botInfo),
        discord: Boolean(global.discordClient?.isReady?.())
    };
    const names = {
        whatsapp: "WhatsApp",
        telegram: "Telegram",
        discord: "Discord"
    };
    return Object.entries(connected)
        .filter(([platform, isConnected]) =>
            isConnected &&
            (typeof config.isPlatformEnabled !== "function" || config.isPlatformEnabled(platform))
        )
        .map(([platform]) => names[platform]);
}

module.exports = {
    name: "infobot",
    aliases: ["sobre", "about", "info_bot", "botinfo", "bot_info", "bot-info"],
    category: null,
    description: `🤖 Exibe informações do bot em execução e sua base de código.

📌 O contato do responsável é exibido por {prefix}dono.

📌 Uso:
{prefix}infobot

💡 Exemplos:
{prefix}infobot
{prefix}sobre
{prefix}about`,
    usage: "{prefix}infobot",

    async execute(message) {
        const info = typeof config.getBotInfo === "function" ? config.getBotInfo() : {};
        const botName = config.getBotName?.() || "Sat Bot";
        const activePlatforms = getActivePlatforms();

        const text = [
            `🤖 *${botName}*`,
            info.description || "Bot multi-plataforma para sua comunidade.",
            `📦 Versão atual: ${pkg.version || "desconhecida"}`,
            "",
            "⚙️ *Bot em execução:*",
            `• Nome: ${botName}`,
            `• Prefixo: ${config.getPrefix?.() || "!"}`,
            `• Plataformas ativas: ${activePlatforms.length ? activePlatforms.join(", ") : "nenhuma conectada"}`,
            "",
            `📌 Use *${message.prefix || "!"}menu* para ver os comandos disponíveis.`,
            "",
            "🧩 *Base utilizada:*",
            "• Sat Bot",
            "• Desenvolvedor: Titannickbub",
            "• Repositório: https://github.com/Titannickbub/SatBot",
            "• Licença: ISC"
        ].join("\n");

        return message.reply({ text });
    }
};
