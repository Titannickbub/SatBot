const { executeTelegramDemotion } = require("../../../functions/telegramAdminHelper");

module.exports = {
    name: "trebaixar",
    category: "adm/membros",
    platformSupport: {
        whatsapp: "none",
        telegram: "full",
        discord: "none"
    },
    description: `⬇️ Remove as permissões administrativas de um membro e o rebaixa para membro no grupo do Telegram.

👤 Você precisa ser administrador com permissão para promover membros.
🤖 O bot precisa ser administrador com permissão para adicionar administradores.

📌 Informe o ID do membro:
{prefix}trebaixar <ID>

Ou responda à mensagem dele:
{prefix}trebaixar

💡 Exemplo:
{prefix}trebaixar 123456789

O criador do grupo e o próprio bot não podem ser rebaixados por este comando.`,
    usage: "{prefix}trebaixar <ID> ou responda à mensagem",
    examples: [
        "{prefix}trebaixar 123456789",
        "Responda à mensagem do membro com {prefix}trebaixar"
    ],
    async execute(message) {
        const result = await executeTelegramDemotion(message);
        return message.reply({ text: result.text });
    }
};
