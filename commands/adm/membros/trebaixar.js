const { executeTelegramDemotion } = require("../../../functions/telegramAdminHelper");

module.exports = {
    name: "trebaixar",
    category: "adm/membros",
    platformSupport: {
        whatsapp: "none",
        telegram: "full",
        discord: "none"
    },
    description: "Rebaixa um administrador do Telegram para membro.",
    usage: "{prefix}trebaixar <ID> ou responda à mensagem",
    async execute(message) {
        const result = await executeTelegramDemotion(message);
        return message.reply({ text: result.text });
    }
};
