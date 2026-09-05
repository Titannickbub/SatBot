const { getUserWarns, getWarnConfig } = require("../../../functions/warnHelper");

module.exports = {
    name: "warns",
    category: "adm/ações imediatas",
    description: "Verifica a quantidade de advertências de um usuário.",
    usage: "{prefix}warns [@user]",

    async execute(message) {
        if (message.isPrivate) return message.reply({ text: "❌ Comando apenas para grupos/servidores." });

        let targetId = message.mentionedJidList?.[0];
        if (!targetId) {
            // Se não mencionou ninguém, vê de si mesmo
            targetId = message.userId;
        }

        const config = getWarnConfig(message);
        if (!config) {
            return message.reply({ text: "❌ Não foi possível ler as configurações." });
        }

        const warns = getUserWarns(message, targetId);

        let who = (targetId === message.userId) ? "Você" : "O usuário";

        return message.reply({ text: `⚠️ ${who} possui *${warns}* advertência(s) de um máximo de *${config.max}*.` });
    }
};
