const { setWarnConfig, getWarnConfig } = require("../../functions/warnHelper");
const { isOwner } = require("../../functions/owners");

module.exports = {
    name: "warnconfig",
    category: "adm",
    description: "Configura o limite de advertências e a ação (kick/ban).",
    usage: "{prefix}warnconfig <max> <kick|ban>",

    async execute(message) {
        if (message.isPrivate) return message.reply({ text: "❌ Comando apenas para grupos/servidores." });

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;

        if (!userOk && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        if (message.args.length < 2) {
            const current = getWarnConfig(message);
            const status = current 
                ? `\n\nAtual: Máx. ${current.max} avisos → Ação: ${current.action}`
                : "";
            return message.reply({ text: `❌ Uso incorreto.\nExemplo: ${message.prefix}warnconfig 3 ban${status}` });
        }

        const max = parseInt(message.args[0]);
        const action = message.args[1].toLowerCase();

        if (isNaN(max) || max < 1) {
            return message.reply({ text: "❌ O número máximo de advertências deve ser maior que zero." });
        }

        if (action !== "kick" && action !== "ban") {
            return message.reply({ text: "❌ A ação deve ser 'kick' ou 'ban'." });
        }

        const success = setWarnConfig(message, max, action);
        if (success) {
            return message.reply({ text: `✅ Configuração de warns atualizada!\nLímite: ${max} advertências\nAção ao atingir: ${action}` });
        } else {
            return message.reply({ text: "❌ Ocorreu um erro ao salvar a configuração." });
        }
    }
};
