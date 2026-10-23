const { getUserWarnHistory, getWarnConfig } = require("../../../functions/warnHelper");
const { parseTargetFromMessage, formatUserMention } = require("../../../functions/moderationHelper");

function formatWarningDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

module.exports = {
    name: "warns",
    category: "adm/ações imediatas",
    description: `📊 Consulta a quantidade e o motivo de cada advertência de um usuário.

👤 Sem informar ninguém, consulta suas próprias advertências.
🎯 Para consultar outra pessoa, mencione-a, responda à mensagem dela ou informe o ID.

📌 Uso:
{prefix}warns [@usuário|id]

💡 Exemplos:
{prefix}warns
{prefix}warns @user
{prefix}warns 123456789012345678`,
    usage: "{prefix}warns @marcar",
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

        const warnings = getUserWarnHistory(message, finalTargetId);
        const isSelf = finalTargetId === message.userId;
        const who = isSelf ? "Você" : formatUserMention(message, finalTargetId);
        const history = [
            ...Array.from(
                { length: warnings.legacyCount },
                (_, index) => `${index + 1}. Motivo não registrado (advertência antiga)`
            ),
            ...warnings.records.map((warning, index) => {
                const date = formatWarningDate(warning.createdAt);
                return `${warnings.legacyCount + index + 1}. ${warning.reason || "Sem motivo informado"}${date ? ` — ${date}` : ""}`;
            })
        ];
        const historyText = history.length
            ? `\n\n📋 Histórico:\n${history.join("\n")}`
            : "\n\nNenhuma advertência registrada.";

        return message.reply({
            text: `⚠️ ${who} possui ${warnings.count} advertência(s) de um máximo de ${config.max}.${historyText}`,
            mentions: (message.platform === "whatsapp" && !isSelf) ? [finalTargetId] : []
        });
    }
};
