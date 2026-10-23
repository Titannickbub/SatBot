const webLinks = require("../functions/webLinks");

module.exports = {
    name: "dashboard",
    aliases: ["painel", "linkdashboard"],
    category: "contas",
    description: `🌐 Envia o link do dashboard web do SatBot.

📝 Use o comando em qualquer conversa:
{prefix}dashboard

O bot envia o link sozinho em uma mensagem. Se o painel estiver configurado com HTTP, envie também um aviso para copiar a mensagem do link e colá-la no navegador, de preferência no Chrome.`,
    usage: "{prefix}dashboard",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },

    async execute(message) {
        const link = webLinks.dashboard();
        if (!link) {
            return message.reply({ text: "❌ O painel web ainda não está configurado. Peça a um super usuário para usar set_dominio." });
        }

        return webLinks.replyWithLink(message, link);
    }
};
