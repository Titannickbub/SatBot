const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { promisify } = require("node:util");
const sharp = require("sharp");
const baileys = require("@whiskeysockets/baileys");
const stickerCommand = require("../commands/sticker/sticker");
const renomearCommand = require("../commands/sticker/renomear");
const { createAudioStickerAudio } = require("../functions/audioStickerHelper");
const { createStickerBuffer, formatStickerPlaceholders } = require("../functions/stickerHelper");
const { createAudioStickerMessage, relayAudioSticker } = require("../functions/whatsappAudioSticker");

const execFileAsync = promisify(execFile);

test("WhatsApp sticker aliases include the sound variants", () => {
    assert.ok(stickerCommand.aliases.includes("sa"));
    assert.ok(stickerCommand.aliases.includes("fa"));
    assert.ok(stickerCommand.aliases.includes("ra"));
});

test("sticker help clearly lists creation modes and related platform commands", () => {
    const documentedAliases = [
        ...stickerCommand.aliases,
        "delfig", "delsticker", "delpack", "deletarpacote", "limparpacote",
        "dsticker", "ds", "dfig", "dfigurinha",
        "fdsticker", "fds", "fdfig", "fdfigurinha",
        "rdsticker", "rds", "rdfig", "rdfigurinha",
        "emoji", "e", "semoji", "addemoji", "femoji", "fe", "remoji", "re"
    ];
    for (const alias of documentedAliases) {
        assert.ok(
            stickerCommand.description.includes(`{prefix}${alias}`) ||
            stickerCommand.usage.includes(`{prefix}${alias}`),
            `sticker help is missing ${alias}`
        );
    }
    assert.match(stickerCommand.description, /somente WhatsApp/);
    assert.match(stickerCommand.description, /somente Telegram/);
    assert.match(stickerCommand.description, /somente Discord/);
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

test("large animated WhatsApp GIFs are reduced and accepted up to 500 KB", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-sticker-gif-"));
    try {
        const gifPath = path.join(directory, "source.gif");
        const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
        await execFileAsync(ffmpegPath, [
            "-y",
            "-v", "error",
            "-f", "lavfi",
            "-i", "testsrc2=size=512x512:rate=15:duration=6",
            "-vf", "noise=alls=80:allf=t+u",
            "-loop", "0",
            gifPath
        ], { timeout: 90000, windowsHide: true });

        const source = await fs.readFile(gifPath);
        assert.ok(source.length > 5 * 1024 * 1024);
        const sticker = await createStickerBuffer(source, {
            platform: "whatsapp",
            mimeType: "image/gif",
            type: "gif",
            addMetadata: true,
            description: "venha pro SatBot https://titannickbub.neocities.org/"
        });
        const metadata = await sharp(sticker, { animated: true, failOn: "none" }).metadata();

        assert.ok(sticker.length <= 500 * 1024);
        assert.equal(metadata.format, "webp");
        assert.ok((Number(metadata.pages) || 0) > 1);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
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
    const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
    const { stdout: audioBuffer } = await execFileAsync(ffmpegPath, [
        "-f", "lavfi", "-i", "sine=frequency=1000:duration=2",
        "-c:a", "libmp3lame", "-f", "mp3", "pipe:1"
    ], { encoding: "buffer", windowsHide: true });

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

test("sa rejects quoted audio over 30 seconds and instructs how to use !cortar", async () => {
    const imageBuffer = await sharp({
        create: {
            width: 64,
            height: 64,
            channels: 4,
            background: "#00ff00"
        }
    }).png().toBuffer();
    const longAudioBuffer = await fs.readFile(path.join(__dirname, "..", "sinal.mp3"));
    let repliedPayload = null;

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
                raw: { seconds: 193 },
                getBuffer: async () => longAudioBuffer
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
        replyAudioSticker: async () => {},
        reply: async payload => { repliedPayload = payload; }
    };

    await stickerCommand.execute(message);

    assert.ok(repliedPayload);
    assert.match(repliedPayload.text, /!cortar/);
    assert.match(repliedPayload.text, /30 segundos/);
});

test("WhatsApp videos longer than 10 seconds automatically use the first 10 seconds", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-sticker-video-"));
    try {
        const videoPath = path.join(directory, "source.mp4");
        const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
        await execFileAsync(ffmpegPath, [
            "-y",
            "-v", "error",
            "-f", "lavfi",
            "-i", "testsrc=size=256x256:rate=10:duration=15",
            "-pix_fmt", "yuv420p",
            videoPath
        ], { timeout: 90000, windowsHide: true });

        const source = await fs.readFile(videoPath);
        const sticker = await createStickerBuffer(source, {
            platform: "whatsapp",
            mimeType: "video/mp4",
            type: "video",
            addMetadata: true
        });

        const metadata = await sharp(sticker, { animated: true, failOn: "none" }).metadata();
        assert.equal(metadata.format, "webp");
        assert.ok((Number(metadata.pages) || 0) > 1);
        assert.ok(sticker.length <= 500 * 1024);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("formatStickerPlaceholders accurately replaces user, n_user, name_bot, n_bot, and namechat", () => {
    const fakeMessage = {
        displayName: "João",
        userId: "5511999998888@s.whatsapp.net",
        botId: "5511888887777@s.whatsapp.net",
        chatId: "120363428039563411@g.us",
        chatType: "group"
    };

    const templatePack = "Pack de {user} ({n_user})";
    const templateAuthor = "{name_bot} - {n_bot}";
    const templateDesc = "Gerado no chat {namechat}";

    const resolvedPack = formatStickerPlaceholders(templatePack, fakeMessage, "SatelaBot");
    const resolvedAuthor = formatStickerPlaceholders(templateAuthor, fakeMessage, "SatelaBot");
    const resolvedDesc = formatStickerPlaceholders(templateDesc, fakeMessage, "SatelaBot");

    assert.equal(resolvedPack, "Pack de João (5511999998888)");
    assert.equal(resolvedAuthor, "SatelaBot - 5511888887777");
    assert.equal(resolvedDesc, "Gerado no chat 120363428039563411");
});

test("createStickerBuffer applies placeholders to EXIF metadata", async () => {
    const source = await sharp({
        create: {
            width: 64,
            height: 64,
            channels: 4,
            background: "#0000ff"
        }
    }).png().toBuffer();

    const fakeMessage = {
        displayName: "Maria",
        userId: "5521977776666@s.whatsapp.net",
        botId: "5511888887777@s.whatsapp.net",
        chatId: "120363999999999999@g.us",
        chatType: "group"
    };

    const sticker = await createStickerBuffer(source, {
        platform: "whatsapp",
        mimeType: "image/png",
        type: "image",
        packName: "Pack de {user}",
        authorName: "Criado por {n_user} via {name_bot} ({n_bot})",
        description: "Chat: {namechat}",
        addMetadata: true,
        message: fakeMessage
    });

    const webpmux = require("node-webpmux");
    const img = new webpmux.Image();
    await img.load(sticker);
    const exifData = img.exif.toString("utf8");

    assert.ok(exifData.includes("Pack de Maria"));
    assert.ok(exifData.includes("5521977776666"));
    assert.ok(exifData.includes("5511888887777"));
    assert.ok(exifData.includes("120363999999999999"));
});

test("renomear command renames WhatsApp stickers preserving format, newlines and placeholders", async () => {
    assert.ok(renomearCommand.aliases.includes("rename"));
    assert.ok(renomearCommand.aliases.includes("steal") || renomearCommand.aliases.includes("rn"));

    // Testa rejeição fora do WhatsApp
    let telegramReply = null;
    await renomearCommand.execute({
        platform: "telegram",
        reply: async payload => { telegramReply = payload; }
    });
    assert.match(telegramReply.text, /WhatsApp/);

    // Cria figurinha original
    const sourceWebp = await sharp({
        create: {
            width: 128,
            height: 128,
            channels: 4,
            background: "#123456"
        }
    }).webp().toBuffer();

    let sentSticker = null;
    const fakeMessage = {
        platform: "whatsapp",
        command: "renomear",
        prefix: "!",
        text: "!renomear figurinha feita\nlinha 2 / por titannick\nlinha autor",
        getArgText: () => "figurinha feita\nlinha 2 / por titannick\nlinha autor",
        displayName: "Titannick",
        userId: "5511999991111@s.whatsapp.net",
        botId: "5511888882222@s.whatsapp.net",
        chatId: "120363111222333444@g.us",
        chatType: "group",
        quoted: {
            media: {
                type: "sticker",
                mimeType: "image/webp",
                getBuffer: async () => sourceWebp
            }
        },
        functions: {
            config: {
                getBotName: () => "SatelaBot"
            }
        },
        react: async () => {},
        replySticker: async sticker => { sentSticker = sticker; }
    };

    await renomearCommand.execute(fakeMessage);

    assert.ok(Buffer.isBuffer(sentSticker));
    assert.equal(sentSticker.subarray(8, 12).toString("ascii"), "WEBP");

    const webpmux = require("node-webpmux");
    const img = new webpmux.Image();
    await img.load(sentSticker);
    const parsedExif = JSON.parse(img.exif.subarray(img.exif.indexOf("{")).toString("utf8"));

    assert.equal(parsedExif["sticker-pack-name"], "figurinha feita\nlinha 2");
    assert.equal(parsedExif["sticker-pack-publisher"], "por titannick\nlinha autor");
});

test("renomear command supports placeholders in pack and author", async () => {
    const sourceWebp = await sharp({
        create: {
            width: 64,
            height: 64,
            channels: 4,
            background: "#654321"
        }
    }).webp().toBuffer();

    let sentSticker = null;
    const fakeMessage = {
        platform: "whatsapp",
        command: "rename",
        prefix: "!",
        text: "!rename Pack de {user} ({n_user}) / {name_bot} - {namechat}",
        getArgText: () => "Pack de {user} ({n_user}) / {name_bot} - {namechat}",
        displayName: "Carlos",
        userId: "5531988887777@s.whatsapp.net",
        botId: "5511888882222@s.whatsapp.net",
        chatId: "120363777888999000@g.us",
        chatType: "group",
        quoted: {
            media: {
                type: "sticker",
                mimeType: "image/webp",
                getBuffer: async () => sourceWebp
            }
        },
        functions: {
            config: {
                getBotName: () => "SatelaBot"
            }
        },
        react: async () => {},
        replySticker: async sticker => { sentSticker = sticker; }
    };

    await renomearCommand.execute(fakeMessage);

    const webpmux = require("node-webpmux");
    const img = new webpmux.Image();
    await img.load(sentSticker);
    const parsedExif = JSON.parse(img.exif.subarray(img.exif.indexOf("{")).toString("utf8"));

    assert.equal(parsedExif["sticker-pack-name"], "Pack de Carlos (5531988887777)");
    assert.equal(parsedExif["sticker-pack-publisher"], "SatelaBot - 120363777888999000");
});

test("renomear command correctly parses when slash has no spaces (e.g. Titannickbub/o melhor da galaxia)", async () => {
    const sourceWebp = await sharp({
        create: {
            width: 64,
            height: 64,
            channels: 4,
            background: "#aabbcc"
        }
    }).webp().toBuffer();

    let sentSticker = null;
    const fakeMessage = {
        platform: "whatsapp",
        command: "renomear",
        prefix: "!",
        text: "!renomear Titannickbub/o melhor da galaxia",
        args: ["Titannickbub/o", "melhor", "da", "galaxia"],
        getArgText: function (fromIndex = 1) {
            if (fromIndex <= 0) return "Titannickbub/o melhor da galaxia";
            return "melhor da galaxia";
        },
        quoted: {
            media: {
                type: "sticker",
                mimeType: "image/webp",
                getBuffer: async () => sourceWebp
            }
        },
        functions: {
            config: {
                getBotName: () => "SatBot"
            }
        },
        react: async () => {},
        replySticker: async sticker => { sentSticker = sticker; }
    };

    await renomearCommand.execute(fakeMessage);

    const webpmux = require("node-webpmux");
    const img = new webpmux.Image();
    await img.load(sentSticker);
    const parsedExif = JSON.parse(img.exif.subarray(img.exif.indexOf("{")).toString("utf8"));

    assert.equal(parsedExif["sticker-pack-name"], "Titannickbub");
    assert.equal(parsedExif["sticker-pack-publisher"], "o melhor da galaxia");
});
