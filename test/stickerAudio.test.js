const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const sharp = require("sharp");
const baileys = require("@whiskeysockets/baileys");
const stickerCommand = require("../commands/sticker/sticker");
const { createAudioStickerAudio } = require("../functions/audioStickerHelper");
const { createStickerBuffer } = require("../functions/stickerHelper");
const { createAudioStickerMessage, relayAudioSticker } = require("../functions/whatsappAudioSticker");

test("WhatsApp sticker aliases include the sound variants", () => {
    assert.ok(stickerCommand.aliases.includes("sa"));
    assert.ok(stickerCommand.aliases.includes("fa"));
    assert.ok(stickerCommand.aliases.includes("ra"));
});

test("WhatsApp-generated WebP metadata includes the configured sticker description", async () => {
    const source = await sharp({
        create: {
            width: 64,
            height: 64,
            channels: 4,
            background: "#ff0000"
        }
    }).png().toBuffer();
    const description = "venha pro SatBot https://titannickbub.neocities.org/";
    const sticker = await createStickerBuffer(source, {
        platform: "whatsapp",
        mimeType: "image/png",
        type: "image",
        packName: "SatBot",
        authorName: "SatBot",
        description,
        addMetadata: true
    });

    assert.equal(sticker.toString("ascii", 8, 12), "WEBP");
    assert.ok(sticker.includes(Buffer.from("sticker-pack-description")));
    assert.ok(sticker.includes(Buffer.from("titannickbub.neocities.org")));
});

test("Baileys audio-sticker protobuf preserves the nested audio message", () => {
    const payload = createAudioStickerMessage(baileys.proto, {
        sticker: Buffer.from([1]),
        audio: Buffer.from([2]),
        stickerMessage: { width: 512, height: 512 },
        audioMessage: { ptt: true, seconds: 1, waveform: Buffer.alloc(64) }
    }, Buffer.alloc(32));
    const encoded = baileys.proto.Message.encode(payload).finish();
    const parsed = baileys.proto.Message.fromObject(payload);

    assert.ok(encoded.includes(Buffer.from([0xb2, 0x08])));
    assert.ok(encoded.includes(Buffer.from([0xd2, 0x01])));
    assert.equal(parsed.audioStickerMessage.message.stickerMessage.audioMessage.ptt, true);
});

test("audio sticker relay supplies the required Baileys message id", async () => {
    let relayArguments = null;
    const socket = {
        relayMessage: async (...args) => { relayArguments = args; }
    };
    const payload = { audioStickerMessage: {} };

    await relayAudioSticker(socket, "chat@s.whatsapp.net", payload);

    assert.equal(relayArguments[0], "chat@s.whatsapp.net");
    assert.equal(relayArguments[1], payload);
    assert.match(relayArguments[2].messageId, /^[A-F0-9]{20}$/);
});

test("audio sticker conversion outputs Opus/Ogg and a waveform", async () => {
    const source = await fs.readFile(path.join(__dirname, "..", "sinal.mp3"));
    const result = await createAudioStickerAudio(source);

    assert.equal(result.buffer.subarray(0, 4).toString("ascii"), "OggS");
    assert.ok(result.durationSeconds > 0 && result.durationSeconds <= 30);
    assert.equal(result.waveform.length, 64);
});

test("sa combines a WhatsApp image with the quoted audio", async () => {
    const imageBuffer = await sharp({
        create: {
            width: 64,
            height: 64,
            channels: 4,
            background: "#00ff00"
        }
    }).png().toBuffer();
    const audioBuffer = await fs.readFile(path.join(__dirname, "..", "sinal.mp3"));
    let sentSticker = null;
    const message = {
        platform: "whatsapp",
        command: "sa",
        prefix: "!",
        media: {
            type: "image",
            mimeType: "image/png",
            getBuffer: async () => imageBuffer
        },
        quoted: {
            media: {
                type: "audio",
                mimeType: "audio/mpeg",
                getBuffer: async () => audioBuffer
            }
        },
        functions: {
            config: {
                getStickerConfig: () => ({
                    packName: "SatBot",
                    authorName: "SatBot",
                    description: "venha pro SatBot https://titannickbub.neocities.org/"
                })
            }
        },
        react: async () => {},
        replyAudioSticker: async data => { sentSticker = data; },
        reply: async () => {}
    };

    await stickerCommand.execute(message);

    assert.ok(Buffer.isBuffer(sentSticker.sticker));
    assert.equal(sentSticker.audio.subarray(0, 4).toString("ascii"), "OggS");
    assert.equal(sentSticker.isAnimated, false);
    assert.ok(sentSticker.sticker.includes(Buffer.from("titannickbub.neocities.org")));
});
