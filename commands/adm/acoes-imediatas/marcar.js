const { cleanJid } = require("../../../functions/moderationHelper");

module.exports = {
    name: "marcar",
    aliases: ["tag", "hidetag"],
    category: "adm/ações imediatas",
    platformSupport: ["whatsapp", "discord"],
    description: `📢 Envia uma mensagem marcando todos do grupo.

No WhatsApp, as menções ficam ocultas no texto. No Discord, o comando usa @everyone.
Não há suporte no Telegram.`,
    usage: "{prefix}marcar [texto]",

    async execute(message) {
        if (!message.sender?.isAdmin) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        if (message.platform === "telegram") {
            return message.reply({ text: "❌ Marcar todos ainda não é compatível com o Telegram." });
        }

        const text = message.getArgText(0).trim();
        if (!text) {
            return message.reply({ text: `❌ Informe a mensagem que deseja enviar. Exemplo: ${message.prefix}hidetag galera, novidade no servidor!` });
        }

        if (message.platform === "discord") {
            if (message.isPrivate) {
                return message.reply({ text: "❌ Este comando só funciona em grupos do WhatsApp ou servidores do Discord." });
            }
            const response = await message.reply({
                text: `@everyone ${text}`,
                allowedMentions: { parse: ["everyone"] }
            });
            if (typeof message.delete === "function") {
                try {
                    await message.delete(message.messageId);
                } catch (error) {
                    console.error("[MARCAR] Falha ao apagar a mensagem do comando no Discord:", error);
                }
            }
            return response;
        }

        if (message.platform !== "whatsapp" || !String(message.chatId || "").endsWith("@g.us")) {
            return message.reply({ text: "❌ Este comando só funciona em grupos do WhatsApp ou servidores do Discord." });
        }

        const sock = global.whatsappSock;
        if (!sock || typeof sock.groupMetadata !== "function") {
            console.error("[MARCAR] Conexão do WhatsApp indisponível.");
            return message.reply({ text: "❌ Não foi possível carregar os membros deste grupo. Tente novamente mais tarde." });
        }

        try {
            const metadata = await sock.groupMetadata(message.chatId);
            const mentions = [...new Set((metadata.participants || [])
                .map(participant => participant.id || participant.phoneNumber || participant.lid)
                .filter(Boolean)
                .map(id => cleanJid(id)))];
            if (!mentions.length) {
                return message.reply({ text: "❌ Não encontrei membros para marcar neste grupo." });
            }

            return await message.reply({ text, mentions });
        } catch (error) {
            console.error("[MARCAR] Falha ao carregar ou marcar os membros do grupo WhatsApp:", error);
            return message.reply({ text: "❌ Não foi possível marcar os membros deste grupo. Tente novamente mais tarde." });
        }
    }
};
