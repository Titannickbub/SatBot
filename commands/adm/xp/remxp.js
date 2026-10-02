const xp = require("../../../functions/xp");
const admin = require("../../../functions/xpAdmin");

module.exports = {
    name: "remxp",
    aliases: ["removexp"],
    category: "adm/RP",
    description: "Remove XP do perfil de um usuário.",
    usage: "{prefix}remxp <quantidade> <id|@usuário>",

    async execute(message) {
        if (!xp.load(message)) return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
        if (!admin.isAdmin(message)) return message.reply({ text: "❌ Apenas administradores podem usar este comando." });

        const amount = admin.parseXp(message.args?.[0]);
        const target = admin.resolveTarget(message, message.args?.slice(1).join(" ").trim());
        if (amount === null || !target) {
            return message.reply({ text: `❌ Uso: ${message.prefix}${message.command} <quantidade> <id|@usuário> ou responda à mensagem do usuário.` });
        }

        const result = xp.adjustXp(message, target, amount, "remove");
        if (!result) return message.reply({ text: "❌ Esse usuário ainda não possui um registro de XP neste grupo/servidor." });
        return message.reply({
            text: `✅ XP removido de ${target.displayName || target.username || target.userId}.\nXP anterior: ${result.previousXp}\nXP atual: ${result.xp}`
        });
    }
};
