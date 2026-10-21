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
⚠️ Os registros apagados não podem ser recuperados. Para evitar um reset acidental, confirme digitando true após o comando.

👤 Resete a atividade respondendo à mensagem do membro:
{prefix}resetatividade true

Ou informe uma menção ou o ID do membro:
{prefix}resetatividade true @usuário
{prefix}resetatividade true <id>

O membro precisa ter registros no ranking de atividade deste chat.

❔ Exiba esta ajuda:
{prefix}resetatividade help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "resetatividade",
    aliases: ["zeraratividade", "resetaratividade"],
    category: "adm/atividade",
    description: DESCRIPTION,
    usage: "{prefix}resetatividade help",
    examples: [
        "{prefix}resetatividade true @usuário",
        "{prefix}resetatividade true <id>",
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

        if (String(message.args?.[0] || "").toLowerCase() !== "true") {
            return message.reply({
                text: `⚠️ Este comando apagará permanentemente a atividade de um membro. Para confirmar, use ${message.prefix}${message.command} true respondendo à mensagem dele ou informando o ID.`
            });
        }

        const targetArgument = message.args.slice(1).join(" ").trim();
        const target = resolveTarget(message, targetArgument);
        if (!target) {
            return message.reply({ text: `❌ Usuário não encontrado no ranking. Informe um membro registrado após true ou responda à mensagem dele.` });
        }

        if (!activity.resetUser(message, target.userId)) {
            return message.reply({ text: "❌ Não foi possível resetar a atividade deste membro." });
        }
        return message.reply({
            text: `✅ Atividade de ${target.displayName || target.username || target.userId} resetada.`
        });
    }
};
