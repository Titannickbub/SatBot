const activity = require("../../../functions/activity");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `📊 Ativa ou desativa o registro de atividade neste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.

✅ Ativar:
{prefix}atividade ativar

🔕 Desativar:
{prefix}atividade desativar

Os registros existentes são preservados ao desativar.

❔ Ajuda:
{prefix}atividade help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "atividade",
    aliases: ["atividadeconfig", "configatividade"],
    category: "adm/RP",
    description: DESCRIPTION,
    usage: "{prefix}atividade <ativar|desativar|help>",

    async execute(message) {
        if (!activity.load(message)) {
            return message.reply({ text: "❌ A atividade só funciona em grupos ou servidores." });
        }
        if (!message.sender?.isAdmin && !message.sender?.isOwner && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem ativar, desativar ou consultar a atividade." });
        }

        const action = String(message.args?.[0] || "help").toLowerCase();
        if (["help", "ajuda"].includes(action)) {
            return message.reply({ text: helpText(message) });
        }
        if (["ativar", "ativaratividade"].includes(action)) {
            activity.configure(message, true);
            return message.reply({ text: "✅ Sistema de atividade ativado. As próximas mensagens serão registradas." });
        }
        if (["desativar", "desativaratividade"].includes(action)) {
            activity.configure(message, false);
            return message.reply({ text: "✅ Sistema de atividade desativado. Os registros foram preservados." });
        }
        return message.reply({
            text: `❌ Uso: ${message.prefix}atividade ativar|desativar|help`
        });
    }
};
