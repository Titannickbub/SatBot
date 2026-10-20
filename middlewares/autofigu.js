const { createStickerBuffer, createTelegramSticker } = require("../functions/stickerHelper");
const autofiguHelper = require("../functions/autofiguHelper");
const config = require("../functions/config");

function supportsStickerConversion(media) {
    if (!media || typeof media.getBuffer !== "function") return false;

    const type = String(media.type || "").toLowerCase();
    const mimeType = String(media.mimeType || "").toLowerCase();
    const isImageOrVideoMime = mimeType.startsWith("image/") || mimeType.startsWith("video/");

    return ["image", "video", "gif"].includes(type) ||
        (isImageOrVideoMime && ["document", "sticker"].includes(type));
}

module.exports = {
    name: "autofigu",
    priority: 50,
    runOn: "all",

    async execute(message) {
        if (!["whatsapp", "telegram"].includes(message.platform) ||
            message.isPrivate ||
            message.isCommand ||
            message.fromMe ||
            message.raw?.key?.fromMe === true ||
            message.sender?.isBot ||
            !supportsStickerConversion(message.media) ||
            !autofiguHelper.getAutofiguEnabled(message)) {
            return true;
        }

        const media = message.media;

        try {
            const buffer = await media.getBuffer();
            if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                throw new Error("O download da mídia retornou um buffer vazio.");
            }

            const stickerConfig = typeof config.getStickerConfig === "function"
                ? config.getStickerConfig()
                : {
                    packName: config.getBotName?.() || "Sat Bot",
                    authorName: config.getBotName?.() || "Sat Bot"
                };

            if (message.platform === "telegram") {
                const sticker = await createTelegramSticker(buffer, {
                    mimeType: media.mimeType,
                    type: media.type,
                    mode: "contain",
                    packName: stickerConfig.packName,
                    authorName: stickerConfig.authorName
                });
                await message.replySticker({ sticker: sticker.buffer, format: sticker.format });
            } else {
                const sticker = await createStickerBuffer(buffer, {
                    mimeType: media.mimeType,
                    type: media.type,
                    platform: message.platform,
                    durationSeconds: media.raw?.seconds,
                    mode: "contain",
                    packName: stickerConfig.packName,
                    authorName: stickerConfig.authorName
                });
                await message.replySticker(sticker);
            }
        } catch (error) {
            console.error(`[AUTOFIGU] Falha ao converter mídia no ${message.platform} (${message.chatId}):`, error);
        }

        return true;
    }
};
