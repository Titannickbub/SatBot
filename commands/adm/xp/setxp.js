const xp = require("../../../functions/xp");
const admin = require("../../../functions/xpAdmin");

module.exports = {
    name: "setxp",
    aliases: ["definirxp"],
    category: "adm/RP",
    description: `🔧 Substitui o XP atual do perfil pelo valor informado, sem somar ao total existente.

🔐 Disponível para administradores do chat e superusuários.

📝 1. Informe a nova quantidade de XP e o usuário:
{prefix}setxp <quantidade> <id|@usuário>
{prefix}setxp 500 @usuario
{prefix}setxp 0 5511999990000

Você também pode responder à mensagem do usuário em vez de mencioná-lo ou informar o ID.

O XP do perfil é substituído pelo valor informado, ignorando o total anterior. O bot exibirá o XP anterior e o novo valor.`,
    usage: "{prefix}setxp <quantidade> <id|@usuário>",

    async execute(message) {
        if (!xp.load(message)) return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
        if (!admin.isAdmin(message)) return message.reply({ text: "❌ Apenas administradores podem usar este comando." });

        const amount = admin.parseXp(message.args?.[0]);
        const target = admin.resolveTarget(message, message.args?.slice(1).join(" ").trim());
        if (amount === null || !target) {
            return message.reply({ text: `❌ Uso: ${message.prefix}${message.command} <quantidade> <id|@usuário> ou responda à mensagem do usuário.` });
        }

        const result = xp.adjustXp(message, target, amount, "set");
        if (!result) return message.reply({ text: "❌ Esse usuário ainda não possui um registro de XP neste grupo/servidor." });
        return message.reply({
            text: `✅ XP definido para ${target.displayName || target.username || target.userId}.\nXP anterior: ${result.previousXp}\nXP atual: ${result.xp}`
        });
    }
};
