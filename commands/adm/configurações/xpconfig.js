const xp = require("../../../functions/xp");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "xpconfig",
    aliases: ["configxp", "configurarxp"],
    category: "adm/RP",
    description: "Ativa e configura o sistema de XP.",
    usage: "{prefix}xpconfig <ativar|desativar|mutar|canal|topico|status>",

    async execute(message) {
        if (!xp.load(message)) return message.reply({ text: "❌ O XP só funciona em grupos ou servidores." });
        if (!message.sender?.isAdmin && !message.sender?.isOwner && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem configurar o XP." });
        }

        const action = String(message.args?.[0] || "status").toLowerCase();
        if (action === "ativar" || action === "ativarxp") {
            xp.configure(message, { enabled: true });
            return message.reply({ text: "✅ Sistema de XP ativado." });
        }
        if (action === "desativar" || action === "desativarxp") {
            xp.configure(message, { enabled: false });
            return message.reply({ text: "✅ Sistema de XP desativado. O progresso foi preservado." });
        }
        if (action === "mutar" || action === "silenciar") {
            xp.configure(message, { muted: true });
            return message.reply({ text: "✅ Mensagens automáticas de level-up silenciadas." });
        }
        if (action === "desmutar") {
            xp.configure(message, { muted: false });
            return message.reply({ text: "✅ Mensagens automáticas de level-up reativadas." });
        }
        if (action === "canal") {
            if (message.platform !== "discord") return message.reply({ text: "❌ No Discord, use este comando em um canal para defini-lo como destino." });
            const channelId = message.raw?.channel?.id || message.channelId;
            xp.configure(message, { chatId: channelId, threadId: null, muted: false });
            return message.reply({ text: "✅ Este canal foi definido para os avisos de level-up." });
        }
        if (action === "topico") {
            if (message.platform !== "telegram") return message.reply({ text: "❌ A configuração de tópico só está disponível no Telegram." });
            if (!message.threadId) return message.reply({ text: "❌ Use este comando dentro de um tópico do Telegram." });
            xp.configure(message, { chatId: message.chatId, threadId: message.threadId, muted: false });
            return message.reply({ text: "✅ Este tópico foi definido para os avisos de level-up." });
        }
        if (action === "chat" || action === "atual") {
            xp.configure(message, { chatId: null, threadId: null, muted: false });
            return message.reply({ text: "✅ Os avisos voltarão a ser enviados no chat atual (ou ficarão silenciados, se configurado)." });
        }
        if (action === "status") {
            const data = xp.load(message);
            const destination = data.levelUp.chatId
                ? `${data.levelUp.chatId}${data.levelUp.threadId ? ` / tópico ${data.levelUp.threadId}` : ""}`
                : "chat atual";
            return message.reply({
                text: `📊 XP: ${data.enabled ? "ativado" : "desativado"}\n🔔 Level-up: ${data.levelUp.muted ? "silenciado" : destination}`
            });
        }
        return message.reply({
            text: `❌ Uso: ${message.prefix}xpconfig ativar|desativar|mutar|desmutar|canal|topico|chat|status`
        });
    }
};
