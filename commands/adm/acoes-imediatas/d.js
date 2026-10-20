module.exports = {
    name: "d",
    description: `🗑️ Apaga a mensagem marcada ou citada.

🤖 O bot precisa ter permissão para gerenciar mensagens.
👤 Você também precisa ter permissão para gerenciar mensagens.

📌 Uso:
{prefix}d #mensagem`,
    category: "adm/ações imediatas",
    usage: "{prefix}d (respondendo à mensagem)",
    async execute(message) {
        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userCanManageMessages = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId, "delete")
            : message.sender?.canManageMessages;

        if (!userCanManageMessages) {
            return await message.reply({
                text: "❌ Você não tem permissão para gerenciar mensagens neste chat."
            });
        }

        if (adapter?.checkBotPermission) {
            const botCanManageMessages = await adapter.checkBotPermission(message.chatId, "delete");
            if (!botCanManageMessages) {
                return message.reply({ text: "❌ O bot não tem permissão para gerenciar mensagens neste chat." });
            }
        }

        // Verifica se uma mensagem foi marcada
        if (!message.quoted) {
            return await message.reply({
                text: "❌ Responda à mensagem que deseja deletar usando este comando."
            });
        }

        try {
            // Deleta a mensagem citada
            await message.delete(message.quoted.messageId, message.quoted.userId);

            // Tenta deletar o comando para manter o chat limpo
            try {
                await message.delete(message.messageId);
            } catch (err) {
                // Silenciosamente ignora se falhar ao deletar a própria mensagem do comando
            }
        } catch (err) {
            console.error("[COMANDO D] Erro ao deletar mensagem:", err);
            await message.reply({
                text: "❌ Falha ao deletar a mensagem. Verifique se o bot possui permissão para gerenciar mensagens."
            });
        }
    }
};
