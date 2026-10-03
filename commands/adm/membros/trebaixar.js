const { executeTelegramDemotion } = require("../../../functions/telegramAdminHelper");

module.exports = {
    name: "trebaixar",
    category: "adm/membros",
    platformSupport: {
        whatsapp: "none",
        telegram: "full",
        discord: "none"
    },
    description: "Remove as permissões administrativas de um membro no grupo do Telegram e o rebaixa para membro. Indique o ID ou responda à mensagem da pessoa.",
    usage: "{prefix}trebaixar <ID> ou responda à mensagem",
    async execute(message) {
        const result = await executeTelegramDemotion(message);
        return message.reply({ text: result.text });
    }
};
