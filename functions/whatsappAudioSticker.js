const crypto = require("crypto");

const AUDIO_STICKER_FIELD24_TAG = 192; // (24 << 3) | 0  -> StickerMessage campo #24 = 0
const AUDIO_STICKER_FIELD25_TAG = 202; // (25 << 3) | 2  -> StickerMessage campo #25 = emoji UTF-8 ("🎵")
const AUDIO_STICKER_INNER_TAG = 210;   // (26 << 3) | 2  -> StickerMessage.audioMessage (campo #26)
const AUDIO_STICKER_OUTER_TAG = 1074;  // (134 << 3) | 2 -> Message.audioStickerMessage (campo #134)
const STREAMING_SIDECAR_CHUNK_SIZE = 64 * 1024; // 65536 bytes (padrão WhatsApp/whatsmeow)

/**
 * Calcula o `streamingSidecar` criptograficamente exato (HMAC-SHA256 10B a cada 64 KiB
 * + overlap de 16B do AES-CBC) sobre o payload enviado à CDN do WhatsApp (`ciphertext || mac10`).
 * Esse metadado é exigido estritamente pelo cliente iOS para streaming e reprodução de AudioMessage.
 */
async function computeVerifiedStreamingSidecar(
    baileys,
    plainBuffer,
    mediaKey,
    mediaType,
    expectedFileEncSha256
) {
    try {
        if (
            !Buffer.isBuffer(plainBuffer) ||
            !plainBuffer.length ||
            !mediaKey ||
            typeof baileys?.getMediaKeys !== "function"
        ) {
            return null;
        }

        const { iv, cipherKey, macKey } = await baileys.getMediaKeys(mediaKey, mediaType);
        if (!iv || !cipherKey || !macKey) return null;

        const aes = crypto.createCipheriv("aes-256-cbc", cipherKey, iv);
        const ciphertext = Buffer.concat([aes.update(plainBuffer), aes.final()]);
        const fileMac = crypto
            .createHmac("sha256", macKey)
            .update(iv)
            .update(ciphertext)
            .digest()
            .subarray(0, 10);
        const dataToUpload = Buffer.concat([ciphertext, fileMac]);

        if (expectedFileEncSha256) {
            const expectedBuf = Buffer.from(expectedFileEncSha256);
            const actualEncSha = crypto.createHash("sha256").update(dataToUpload).digest();
            if (!actualEncSha.equals(expectedBuf)) {
                return null;
            }
        }

        const stream = Buffer.concat([iv, dataToUpload]);
        const chunks = [];
        for (let pos = 0; pos < dataToUpload.length; pos += STREAMING_SIDECAR_CHUNK_SIZE) {
            const slice = stream.subarray(
                pos,
                Math.min(pos + STREAMING_SIDECAR_CHUNK_SIZE + 16, stream.length)
            );
            chunks.push(
                crypto.createHmac("sha256", macKey).update(slice).digest().subarray(0, 10)
            );
        }
        return Buffer.concat(chunks);
    } catch {
        return null;
    }
}

function patchAudioStickerProto(proto) {
    const Message = proto?.Message;
    const StickerMessage = Message?.StickerMessage;
    const AudioMessage = Message?.AudioMessage;
    const FutureProofMessage = Message?.FutureProofMessage;
    if (!Message || !StickerMessage || !AudioMessage || !FutureProofMessage) {
        throw new Error("A versão instalada do Baileys não contém os tipos protobuf necessários para stickers com áudio.");
    }
    if (Message.__satBotAudioStickerPatched) return;

    const stickerEncode = StickerMessage.encode.bind(StickerMessage);
    StickerMessage.encode = function encode(message, writer) {
        writer = stickerEncode(message, writer);
        if (message?.audioMessage != null) {
            // Campo #24 (varint = 0, presente em stickers sonoros oficiais)
            const field24Val = typeof message.stickerField24 === "number" ? message.stickerField24 : 0;
            writer.uint32(AUDIO_STICKER_FIELD24_TAG).uint32(field24Val);
            // Campo #25 (emoji UTF-8 associado ao sticker sonoro, ex.: "🎵")
            if (typeof message.stickerEmoji === "string" && message.stickerEmoji.length > 0) {
                writer.uint32(AUDIO_STICKER_FIELD25_TAG).string(message.stickerEmoji);
            }
            // Campo #26 (AudioMessage aninhado, sem ptt)
            AudioMessage.encode(
                message.audioMessage,
                writer.uint32(AUDIO_STICKER_INNER_TAG).fork()
            ).ldelim();
        }
        return writer;
    };

    const stickerFromObject = StickerMessage.fromObject.bind(StickerMessage);
    StickerMessage.fromObject = function fromObject(object) {
        const message = stickerFromObject(object);
        if (object?.audioMessage != null) {
            message.stickerField24 = typeof object.stickerField24 === "number" ? object.stickerField24 : 0;
            if (typeof object.stickerEmoji === "string" && object.stickerEmoji.length > 0) {
                message.stickerEmoji = object.stickerEmoji;
            }
            const audioMsg = AudioMessage.fromObject(object.audioMessage);
            // Clientes oficiais omitem campo #6 (ptt) dentro de StickerMessage.audioMessage
            if (object.audioMessage.ptt !== true) {
                delete audioMsg.ptt;
            }
            message.audioMessage = audioMsg;
        }
        return message;
    };

    const messageEncode = Message.encode.bind(Message);
    Message.encode = function encode(message, writer) {
        let target = message;
        if (target?.stickerMessage?.__satBotEncHintOnly) {
            target = { ...target };
            delete target.stickerMessage;
        }
        writer = messageEncode(target, writer);
        if (target?.audioStickerMessage != null) {
            FutureProofMessage.encode(
                target.audioStickerMessage,
                writer.uint32(AUDIO_STICKER_OUTER_TAG).fork()
            ).ldelim();
        }
        return writer;
    };

    const messageFromObject = Message.fromObject.bind(Message);
    Message.fromObject = function fromObject(object) {
        let source = object;
        if (source?.stickerMessage?.__satBotEncHintOnly) {
            source = { ...source };
            delete source.stickerMessage;
        }
        const message = messageFromObject(source);
        if (source?.audioStickerMessage != null) {
            message.audioStickerMessage = FutureProofMessage.fromObject(
                source.audioStickerMessage
            );
        }
        return message;
    };

    Object.defineProperty(Message, "__satBotAudioStickerPatched", { value: true });
}

function createAudioStickerMessage(proto, data, messageSecret) {
    patchAudioStickerProto(proto);
    if (!Buffer.isBuffer(data.sticker) || !Buffer.isBuffer(data.audio)) {
        throw new TypeError("O sticker e o áudio devem ser buffers.");
    }

    return {
        messageContextInfo: { messageSecret },
        audioStickerMessage: {
            message: {
                stickerMessage: {
                    ...data.stickerMessage,
                    audioMessage: data.audioMessage
                }
            }
        }
    };
}

function relayAudioSticker(sock, chatId, payload) {
    if (typeof sock?.relayMessage !== "function") {
        throw new Error("O socket Baileys não disponibiliza relayMessage.");
    }

    const relayPayload = {
        ...payload,
        stickerMessage: { __satBotEncHintOnly: true }
    };

    return sock.relayMessage(chatId, relayPayload, {
        messageId: crypto.randomBytes(10).toString("hex").toUpperCase()
    });
}

module.exports = {
    AUDIO_STICKER_FIELD24_TAG,
    AUDIO_STICKER_FIELD25_TAG,
    AUDIO_STICKER_INNER_TAG,
    AUDIO_STICKER_OUTER_TAG,
    computeVerifiedStreamingSidecar,
    patchAudioStickerProto,
    createAudioStickerMessage,
    relayAudioSticker
};
