const suggestionService = require("../functions/suggestionService");

const DESCRIPTION = `📣 Envie um bug ou uma sugestão para a equipe do bot.

📌 Uso:
{prefix}bug <texto>
{prefix}sugestao <texto>
{prefix}report <texto>

Você também pode enviar uma foto com o comando na legenda ou responder a uma foto com o comando.`;

module.exports = {
    name: "bug",
    aliases: ["sugestao", "report"],
    category: null,
    description: DESCRIPTION,
    usage: "{prefix}bug <texto>",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },

    async execute(message) {
        try {
            const suggestion = await suggestionService.submit(message);
            let deliveryWarning = "";
            try {
                await suggestionService.deliver(suggestion);
            } catch (error) {
                deliveryWarning = " A sugestão foi salva, mas não consegui enviá-la ao canal configurado.";
                console.error(`[BUG] Falha ao encaminhar sugestão ${suggestion.id}:`, error.message || error);
            }
            return message.reply({
                text: `✅ Sua sugestão foi registrada com o ID #${suggestion.id}.${deliveryWarning}`
            });
        } catch (error) {
            return message.reply({
                text: `❌ ${error.message || "Não foi possível registrar sua sugestão."}`
            });
        }
    }
};
