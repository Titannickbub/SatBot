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

module.exports = {
    name: "resetatividade",
    aliases: ["zeraratividade", "resetaratividade"],
    category: "adm/RP",
    description: "Apaga o histórico de atividade de um usuário neste grupo ou servidor. Informe o ID ou mencione a pessoa cujo contador deseja zerar.",
    usage: "{prefix}resetatividade <id|@usuário>",

    async execute(message) {
        if (!activity.load(message)) {
            return message.reply({ text: "❌ A atividade só funciona em grupos ou servidores." });
        }
        if (!isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem resetar a atividade." });
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
