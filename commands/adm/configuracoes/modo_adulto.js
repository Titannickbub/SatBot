const groupSettings = require("../../../functions/groupSettings");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "modo_adulto",
    aliases: ["adultmode", "modoadulto"],
    category: "adm/configurações",
    description: `🔞 Ativa ou desativa a permissão adulta do grupo no WhatsApp.

🔐 Disponível para administradores e superusuários.
✅ Ativar: {prefix}modo_adulto on
🔕 Desativar: {prefix}modo_adulto off
📋 Consultar: {prefix}modo_adulto status`,
    usage: "{prefix}modo_adulto on|off|status",
    async execute(message) {
        if (message.platform !== "whatsapp") {
            return message.reply({ text: "❌ Esta configuração só existe para grupos do WhatsApp." });
        }
        if (message.isPrivate || message.isCommunity || message.chatType !== "group" || !message.chatId) {
            return message.reply({ text: "❌ Use este comando em um grupo do WhatsApp." });
        }
        if (!message.sender?.isAdmin && !message.sender?.canManageMessages &&
            !message.sender?.isOwner && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores do grupo ou superusuários podem alterar esta configuração." });
        }

        const data = groupSettings.loadSettings("whatsapp", String(message.chatId), "group");
        if (!data.settings || typeof data.settings !== "object" || Array.isArray(data.settings)) {
            data.settings = {};
        }
        const operation = String(message.args?.[0] || "status").toLowerCase();
        if (["on", "ativar", "ativado", "enable"].includes(operation)) {
            data.settings.adultMode = true;
        } else if (["off", "desativar", "desativado", "disable"].includes(operation)) {
            data.settings.adultMode = false;
        } else if (!["status", "help", "ajuda"].includes(operation)) {
            return message.reply({ text: `❌ Uso: ${message.prefix || "!"}modo_adulto on|off|status` });
        }

        if (!["status", "help", "ajuda"].includes(operation) &&
            !groupSettings.saveSettings("whatsapp", String(message.chatId), "group", data, {
                raw: message.raw,
                groupName: message.groupName,
                chatName: message.groupName
            })) {
            return message.reply({ text: "❌ Não foi possível salvar o modo adulto do grupo." });
        }
        if (["help", "ajuda"].includes(operation)) {
            return message.reply({
                text: this.description.replaceAll("{prefix}", message.prefix || "!")
            });
        }
        return message.reply({
            text: `🔞 Modo adulto do grupo: ${data.settings.adultMode ? "ativado" : "desativado"}.`
        });
    }
};
