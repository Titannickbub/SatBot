const telegramStickerHelper = require("../functions/telegramStickerHelper");

module.exports = {
    name: "delpack",
    aliases: ["delfig", "delsticker", "deletarpacote", "limparpacote"],
    description: "Exclui o seu pacote de figurinhas do Telegram ou uma figurinha específica marcada no chat.",
    category: "sticker",
    usage: "{prefix}delpack (excluir pacote completo) ou {prefix}delfig (respondendo a uma figurinha)",
    examples: [
        "{prefix}delpack / {prefix}deletarpacote — Deleta seu pacote inteiro no Telegram",
        "{prefix}delfig / {prefix}delsticker — Deleta a figurinha citada do seu pacote"
    ],

    async execute(message) {
        if (message.platform !== "telegram") {
            return message.reply({ text: "❌ O gerenciamento de pacotes de figurinhas é exclusivo do Telegram no momento." });
        }

        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        const botInst = global.telegramBot;

        if (!store || !botInst) {
            return message.reply({ text: "❌ Sistema de contas ou bot do Telegram indisponível." });
        }

        const central = store.findByPlatform("telegram", message.userId);
        if (!central) {
            return message.reply({ text: "⚠️ Você precisa de uma Conta Central vinculada para gerenciar pacotes. Use `!perfil` para verificar." });
        }

        const packName = store.getTelegramStickerPack(central.id);
        const cmdName = (message.command || "delpack").toLowerCase();
        const repliedSticker = message.raw?.message?.reply_to_message?.sticker;
        const isDeleteStickerMode = ["delfig", "delsticker"].includes(cmdName) || !!repliedSticker;

        // MODO 1: Excluir uma figurinha específica marcada
        if (isDeleteStickerMode && repliedSticker) {
            const stickerFileId = repliedSticker.file_id;

            try {
                await message.react("⏳").catch(() => {});
                await telegramStickerHelper.deleteStickerFromSet(botInst, stickerFileId);
                await message.react("✅").catch(() => {});
                return message.reply({ text: "🗑️ **Figurinha removida do seu pacote com sucesso!**" });
            } catch (err) {
                console.error("[DELPACK] Erro ao deletar figurinha:", err.message || err);
                await message.react("❌").catch(() => {});
                const errMsg = String(err.message || err);

                if (errMsg.includes("STICKERSET_NOT_MODIFIED") || errMsg.includes("NOT_MODIFIED")) {
                    return message.reply({ text: "ℹ️ Esta figurinha já foi removida anteriormente do seu pacote." });
                }

                if (errMsg.includes("STICKER_INVALID") || errMsg.includes("not belong") || errMsg.includes("STICKERSET_INVALID") || errMsg.includes("not found")) {
                    return message.reply({ text: "⚠️ A figurinha marcada não pertence a um pacote de figurinhas gerenciado por este bot." });
                }

                if (errMsg.includes("USER_IS_NOT_SET_OWNER") || errMsg.includes("BOT_IS_NOT_SET_OWNER")) {
                    return message.reply({ text: "❌ O bot não possui permissão para modificar este pacote de figurinhas." });
                }

                return message.reply({ text: "❌ Não foi possível excluir a figurinha. Verifique se ela pertence ao seu pacote e tente novamente." });
            }
        }

        // MODO 2: Excluir o pacote inteiro do usuário
        if (!packName) {
            return message.reply({ text: "⚠️ Você não possui nenhum pacote de figurinhas registrado no momento." });
        }

        try {
            await message.react("⏳").catch(() => {});
            await telegramStickerHelper.deleteStickerSet(botInst, packName);
            await store.setTelegramStickerPack(central.id, null);
            await message.react("✅").catch(() => {});

            return message.reply({
                text: `🗑️ **Seu pacote de figurinhas no Telegram foi excluído com sucesso!**\n\n📌 *Da próxima vez que usar \`${message.prefix}sticker\`, um novo pacote será criado automaticamente.*`
            });
        } catch (err) {
            console.error("[DELPACK] Erro ao deletar pacote de figurinhas:", err.message || err);
            await message.react("❌").catch(() => {});
            const errMsg = String(err.message || err);

            if (errMsg.includes("STICKERSET_INVALID") || errMsg.includes("does not exist") || errMsg.includes("NOT_MODIFIED")) {
                await store.setTelegramStickerPack(central.id, null);
                return message.reply({ text: "ℹ️ O seu pacote de figurinhas já havia sido removido ou não existia mais. Os registros da sua conta foram atualizados!" });
            }

            return message.reply({ text: "❌ Falha ao excluir o pacote de figurinhas. Tente novamente em instantes." });
        }
    }
};
