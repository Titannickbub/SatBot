const crypto = require("crypto");

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
            AudioMessage.encode(message.audioMessage, writer.uint32(210).fork()).ldelim();
        }
        return writer;
    };

    const stickerFromObject = StickerMessage.fromObject.bind(StickerMessage);
    StickerMessage.fromObject = function fromObject(object) {
        const message = stickerFromObject(object);
        if (object?.audioMessage != null) {
            message.audioMessage = AudioMessage.fromObject(object.audioMessage);
        }
        return message;
    };

    const messageEncode = Message.encode.bind(Message);
    Message.encode = function encode(message, writer) {
        writer = messageEncode(message, writer);
        if (message?.audioStickerMessage != null) {
            FutureProofMessage.encode(message.audioStickerMessage, writer.uint32(1074).fork()).ldelim();
        }
        return writer;
    };

    const messageFromObject = Message.fromObject.bind(Message);
    Message.fromObject = function fromObject(object) {
        const message = messageFromObject(object);
        if (object?.audioStickerMessage != null) {
            message.audioStickerMessage = FutureProofMessage.fromObject(object.audioStickerMessage);
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

    return sock.relayMessage(chatId, payload, {
        messageId: crypto.randomBytes(10).toString("hex").toUpperCase()
    });
}

module.exports = {
    patchAudioStickerProto,
    createAudioStickerMessage,
    relayAudioSticker
};
