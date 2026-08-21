module.exports = {
    name: "clear10",
    aliases: ["limpar10", "purge10", "deletar10"],
    category: "adm",
    description: "Remove as últimas 10 mensagens apenas do canal/chat onde o comando foi executado. Em Discord, limpa o canal atual; em Telegram, limpa o chat atual. Esse comando não apaga mensagens de outros canais/servidores.",
    usage: "{prefix}clear10",
    examples: ["{prefix}clear10"],

    async execute(message) {
        if (!message || message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores do Discord/Telegram." });
        }

        const sender = message.sender || {};
        if (!sender.isAdmin && !sender.isOwner && !sender.canManageMessages) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        if (message.platform === "discord") {
            try {
                const channel = message.channel || message.raw?.channel || null;
                if (!channel || typeof channel.messages?.fetch !== "function" || typeof channel.bulkDelete !== "function") {
                    return message.reply({ text: "❌ Não foi possível localizar o canal atual do Discord." });
                }

                const currentMessageId = String(message.messageId || message.id || "");
                const msgs = await channel.messages.fetch({ limit: 10 }).catch(() => new Map());
                const msgArray = Array.from(msgs.values())
                    .filter(msg => String(msg.id) !== currentMessageId)
                    .slice(0, 10);

                if (!msgArray.length) {
                    return message.reply({ text: "✅ Não havia mensagens recentes para limpar neste canal." });
                }

                await channel.bulkDelete(msgArray, true).catch(() => {});
                return message.reply({ text: `✅ Últimas ${msgArray.length} mensagens deste canal foram removidas.` }).catch(() => {
                    console.warn("[CLEAR10] Falha ao responder no Discord após limpeza do canal.");
                });
            } catch (err) {
                return message.reply({ text: `❌ Falha ao limpar mensagens do canal atual: ${err.message || err}` });
            }
        }

        if (message.platform === "telegram") {
            try {
                const telegramApi = message.raw?.telegram || global.telegramBot;
                if (!telegramApi) {
                    return message.reply({ text: "❌ Bot do Telegram não disponível." });
                }

                const history = await telegramApi.getChatHistory(message.chatId, { limit: 10 }).catch(() => []);
                let deleted = 0;

                for (const msg of history) {
                    const id = msg && msg.message_id;
                    if (!id) continue;
                    await telegramApi.deleteMessage(message.chatId, id).catch(() => {});
                    deleted += 1;
                }

                return message.reply({ text: `✅ Últimas ${deleted} mensagens do chat foram removidas.` });
            } catch (err) {
                return message.reply({ text: `❌ Falha ao limpar mensagens do Telegram: ${err.message || err}` });
            }
        }

        return message.reply({ text: "❌ Este comando só funciona em Discord e Telegram." });
    }
};
