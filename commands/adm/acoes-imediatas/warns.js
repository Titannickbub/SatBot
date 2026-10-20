const { getUserWarns, getWarnConfig } = require("../../../functions/warnHelper");
const { parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");

module.exports = {
    name: "warns",
    category: "adm/ações imediatas",
    description: `📊 Consulta a quantidade de advertências de um usuário no grupo ou servidor.

👤 Sem informar ninguém, consulta suas próprias advertências.
🎯 Para consultar outra pessoa, mencione-a, responda à mensagem dela ou informe o ID.

📌 Uso:
{prefix}warns [@usuário|id]

💡 Exemplos:
{prefix}warns
{prefix}warns @user
{prefix}warns 123456789012345678`,
    usage: "{prefix}warns [@usuário|id]",
    examples: [
        "{prefix}warns",
        "{prefix}warns @user",
        "{prefix}warns 123456789012345678"
    ],

    async execute(message) {
        if (message.isPrivate) return message.reply({ text: "❌ Comando apenas para grupos/servidores." });

        const { targetId } = parseTargetFromMessage(message);
        const finalTargetId = targetId || message.userId;

        const config = getWarnConfig(message);
        if (!config) {
            return message.reply({ text: "❌ Não foi possível ler as configurações." });
        }

        const warns = getUserWarns(message, finalTargetId);
        const isSelf = finalTargetId === message.userId;
        const who = isSelf ? "Você" : formatUserMention(message, finalTargetId);

        return message.reply({
            text: `⚠️ ${who} possui *${warns}* advertência(s) de um máximo de *${config.max}*.`,
            mentions: (message.platform === "whatsapp" && !isSelf) ? [finalTargetId] : []
        });
    }
};
