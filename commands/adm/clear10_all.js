module.exports = {
    name: "clear10_all",
    aliases: ["limpar10all", "purge10all", "deletar10all", "clearall10"],
    category: "adm",
    description: "Remove as últimas 10 mensagens de todos os canais do servidor inteiro no Discord. É um comando de alcance global do servidor e não é restrito ao canal atual.",
    usage: "{prefix}clear10_all",
    examples: ["{prefix}clear10_all"],

    async execute(message) {
        if (!message || message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em servidores do Discord." });
        }

        const sender = message.sender || {};
        if (!sender.isAdmin && !sender.isOwner && !sender.canManageMessages) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        if (message.platform !== "discord") {
            return message.reply({ text: "❌ Este comando só funciona no Discord." });
        }

        try {
            const guild = message.raw?.guild || (message.platforms || []).find(p => p.name === "discord")?.client?.guilds?.cache?.get(message.guildId);
            if (!guild) {
                return message.reply({ text: "❌ Não foi possível localizar o servidor do Discord." });
            }

            const channels = guild.channels.cache.filter(ch => ch && ch.isTextBased && typeof ch.bulkDelete === "function");
            const currentMessageId = String(message.messageId || message.id || "");
            let deleted = 0;

            for (const channel of channels.values()) {
                try {
                    const msgs = await channel.messages.fetch({ limit: 10 }).catch(() => new Map());
                    const msgArray = Array.from(msgs.values())
                        .filter(msg => String(msg.id) !== currentMessageId)
                        .slice(0, 10);

                    if (!msgArray.length) continue;
                    await channel.bulkDelete(msgArray, true).catch(() => {});
                    deleted += msgArray.length;
                } catch (err) {
                    // ignora falhas por canal
                }
            }

            return message.reply({ text: `✅ Processo concluído. ${deleted} mensagens foram removidas em todos os canais do servidor.` }).catch(() => {
                console.warn("[CLEAR10_ALL] Falha ao responder no Discord após limpeza global.");
            });
        } catch (err) {
            return message.reply({ text: `❌ Falha ao limpar o servidor inteiro: ${err.message || err}` });
        }
    }
};
