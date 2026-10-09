const activity = require("../../../functions/activity");
const { isOwner } = require("../../../functions/owners");

function isAdmin(message) {
    return Boolean(message.sender?.isAdmin || message.sender?.isOwner || isOwner(message));
}

function resolveTarget(message, targetArgument) {
    const candidates = [
        message.quoted?.userId,
        message.platform === "discord" ? message.raw?.mentions?.users?.first()?.id : null,
        ...(message.mentionedJids || []),
        targetArgument
    ].filter(Boolean);

    for (const candidate of candidates) {
        const user = activity.findUser(message, candidate);
        if (user) return user;
    }
    return null;
}

const DESCRIPTION = `♻️ Apaga os registros de atividade de um membro neste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.
⚠️ Os registros apagados não podem ser recuperados.

👤 Resete a atividade respondendo à mensagem do membro:
{prefix}resetatividade

Ou informe uma menção ou o ID do membro:
{prefix}resetatividade @usuário
{prefix}resetatividade <id>

O membro precisa ter registros no ranking de atividade deste chat.

❔ Exiba esta ajuda:
{prefix}resetatividade help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "resetatividade",
    aliases: ["zeraratividade", "resetaratividade"],
    category: "adm/RP",
    description: DESCRIPTION,
    usage: "{prefix}resetatividade <id|@usuário|#mensagem|help>",
    examples: [
        "{prefix}resetatividade @usuário",
        "{prefix}resetatividade <id>",
        "{prefix}resetatividade help"
    ],

    async execute(message) {
        if (!activity.load(message)) {
            return message.reply({ text: "❌ A atividade só funciona em grupos ou servidores." });
        }
        if (!isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem resetar a atividade." });
        }

        if (["help", "ajuda"].includes(String(message.args?.[0] || "").toLowerCase())) {
            return message.reply({ text: helpText(message) });
        }

        const target = resolveTarget(message, message.args?.join(" ").trim());
        if (!target) {
            return message.reply({
                text: `❌ Usuário não encontrado no ranking. Use ${message.prefix}${message.command} <id|@usuário> ou responda à mensagem dele.`
            });
        }

        activity.resetUser(message, target.userId);
        return message.reply({
            text: `✅ Atividade de ${target.displayName || target.username || target.userId} resetada.`
        });
    }
};
