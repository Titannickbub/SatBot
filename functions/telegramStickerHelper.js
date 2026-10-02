const { Input } = require("telegraf");

function generatePackName(centralId, botUsername) {
    const cleanCentralId = String(centralId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toLowerCase();
    const cleanBotUser = String(botUsername || "bot").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    return `sat_${cleanCentralId}_by_${cleanBotUser}`;
}

async function createOrAddStickerToPack(bot, telegramUserId, packName, packTitle, stickerBuffer, format = "static") {
    if (!bot || !bot.telegram) {
        throw new Error("Instância do Telegram Bot não encontrada.");
    }
    if (!["static", "video"].includes(format)) {
        throw new Error(`Formato de figurinha do Telegram inválido: ${format}`);
    }

    const userIdNum = Number(telegramUserId);
    const filename = format === "video" ? "sticker.webm" : "sticker.webp";

    // 1. Upload do arquivo de figurinha para o Telegram para obter o file_id do arquivo
    let uploadedFile = null;
    try {
        uploadedFile = await bot.telegram.uploadStickerFile(
            userIdNum,
            Input.fromBuffer(stickerBuffer, filename),
            format
        );
    } catch (uploadErr) {
        console.error("[TELEGRAM_STICKER_UPLOAD] Falha no uploadStickerFile:", uploadErr.message || uploadErr);
        throw uploadErr;
    }

    const tempFileId = uploadedFile?.file_id || (typeof uploadedFile === "string" ? uploadedFile : null);
    if (!tempFileId) {
        throw new Error("Não foi possível obter o file_id do sticker após o uploadStickerFile.");
    }

    const inputSticker = {
        sticker: tempFileId,
        emoji_list: ["📌"],
        format
    };

    let isCreated = false;

    try {
        // Tenta adicionar ao pacote existente
        await bot.telegram.callApi("addStickerToSet", {
            user_id: userIdNum,
            name: packName,
            sticker: JSON.stringify(inputSticker)
        });
    } catch (addErr) {
        const errMsg = String(addErr.message || addErr);

        // Se o pacote não existir ou precisar ser criado:
        if (errMsg.includes("STICKERSET_INVALID") || errMsg.includes("PEER_ID_INVALID") || errMsg.includes("set not found") || errMsg.includes("does not exist")) {
            await bot.telegram.callApi("createNewStickerSet", {
                user_id: userIdNum,
                name: packName,
                title: packTitle || "Pacote Satela",
                stickers: JSON.stringify([inputSticker]),
                sticker_type: "regular"
            });
            isCreated = true;
        } else {
            throw addErr;
        }
    }

    // 2. Busca o pacote de figurinhas atualizado no Telegram para pegar a figurinha real pertencente ao pack
    let realStickerFileId = null;
    try {
        const stickerSet = await bot.telegram.getStickerSet(packName);
        if (stickerSet && Array.isArray(stickerSet.stickers) && stickerSet.stickers.length > 0) {
            const lastSticker = stickerSet.stickers[stickerSet.stickers.length - 1];
            realStickerFileId = lastSticker.file_id;
        }
    } catch (getErr) {
        console.warn("[TELEGRAM_STICKER_SET] Não foi possível buscar getStickerSet:", getErr.message || getErr);
    }

    return {
        created: isCreated,
        packName,
        fileId: realStickerFileId || tempFileId,
        packUrl: `https://t.me/addstickers/${packName}`
    };
}

async function deleteStickerFromSet(bot, stickerFileId) {
    if (!bot || !bot.telegram) {
        throw new Error("Instância do Telegram Bot não encontrada.");
    }
    return await bot.telegram.callApi("deleteStickerFromSet", {
        sticker: String(stickerFileId)
    });
}

async function deleteStickerSet(bot, packName) {
    if (!bot || !bot.telegram) {
        throw new Error("Instância do Telegram Bot não encontrada.");
    }
    return await bot.telegram.callApi("deleteStickerSet", {
        name: String(packName)
    });
}

module.exports = {
    generatePackName,
    createOrAddStickerToPack,
    deleteStickerFromSet,
    deleteStickerSet
};
