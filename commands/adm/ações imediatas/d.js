module.exports = {
    name: "d",
    description: "Apaga a mensagem à qual você respondeu. Responda à mensagem que deseja remover e envie o comando; não é preciso informar o ID do autor.",
    category: "adm/ações imediatas",
    usage: "{prefix}d (respondendo à mensagem)",
    async execute(message) {
        // Verifica se o usuário tem permissão para gerenciar mensagens
        if (!message.sender || !message.sender.canManageMessages) {
            return await message.reply({
                text: "❌ Você não tem permissão para gerenciar mensagens neste chat."
            });
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
                text: "❌ Falha ao deletar a mensagem. Verifique se o bot possui permissão de administrador."
            });
        }
    }
};
