const sharp = require("sharp");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const config = require("./config");

const execFileAsync = promisify(execFile);
const WHATSAPP_STATIC_STICKER_LIMIT = 100 * 1024;
const WHATSAPP_ANIMATED_STICKER_LIMIT = 500 * 1024;
const WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT = 10;
const TELEGRAM_VIDEO_STICKER_LIMIT = 256 * 1024;
const TELEGRAM_VIDEO_STICKER_DURATION_LIMIT = 3;

function createStickerError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function getFfmpegPath() {
    try {
        return require("@ffmpeg-installer/ffmpeg").path;
    } catch {
        return "ffmpeg";
    }
}

function getResizeFilter(mode) {
    if (mode === "fill") {
        return "scale=512:512";
    }
    if (mode === "cover") {
        return "scale=512:512:force_original_aspect_ratio=increase,crop=512:512";
    }
    return "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000";
}

async function convertAnimatedToWebp(inputBuffer, mode, maxSizeBytes) {
    const tempId = `sticker_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `${tempId}.media`);
    const outputPath = path.join(tempDir, `${tempId}.webp`);
    const attempts = [
        { fps: 15, quality: 70 },
        { fps: 12, quality: 60 },
        { fps: 10, quality: 50 },
        { fps: 8, quality: 40 }
    ];

    try {
        fs.writeFileSync(inputPath, inputBuffer);

        for (const attempt of attempts) {
            try {
                await execFileAsync(getFfmpegPath(), [
                    "-y",
                    "-i", inputPath,
                    "-an",
                    "-vf", `fps=${attempt.fps},${getResizeFilter(mode)}`,
                    "-c:v", "libwebp",
                    "-loop", "0",
                    "-lossless", "0",
                    "-preset", "icon",
                    "-quality", String(attempt.quality),
                    outputPath
                ], { timeout: 90000, windowsHide: true });
            } catch (error) {
                throw new Error(`FFmpeg não conseguiu converter o GIF/vídeo em figurinha: ${error.message}`);
            }

            const result = fs.readFileSync(outputPath);
            if (result.length <= maxSizeBytes) {
                return result;
            }
        }
    } finally {
        for (const filePath of [inputPath, outputPath]) {
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                if (error.code !== "ENOENT") {
                    console.warn(`[STICKER_HELPER] Não foi possível remover arquivo temporário ${filePath}:`, error.message);
                }
            }
        }
    }

    throw createStickerError(
        `A figurinha animada excede o limite de ${Math.round(maxSizeBytes / 1024)} KB do WhatsApp mesmo após a compressão.`,
        "STICKER_SIZE_LIMIT"
    );
}

async function createTelegramVideoStickerBuffer(inputBuffer, mode) {
    const tempId = `telegram_sticker_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `${tempId}.media`);
    const outputPath = path.join(tempDir, `${tempId}.webm`);
    const attempts = [
        { fps: 30, crf: 35 },
        { fps: 24, crf: 40 },
        { fps: 20, crf: 45 },
        { fps: 15, crf: 50 }
    ];

    try {
        fs.writeFileSync(inputPath, inputBuffer);

        for (const attempt of attempts) {
            try {
                await execFileAsync(getFfmpegPath(), [
                    "-y",
                    "-i", inputPath,
                    "-t", String(TELEGRAM_VIDEO_STICKER_DURATION_LIMIT),
                    "-an",
                    "-vf", `fps=${attempt.fps},${getResizeFilter(mode)}`,
                    "-c:v", "libvpx-vp9",
                    "-pix_fmt", "yuva420p",
                    "-auto-alt-ref", "0",
                    "-deadline", "good",
                    "-cpu-used", "5",
                    "-b:v", "0",
                    "-crf", String(attempt.crf),
                    "-f", "webm",
                    outputPath
                ], { timeout: 90000, windowsHide: true });
            } catch (error) {
                throw new Error(`FFmpeg não conseguiu converter a mídia em figurinha de vídeo do Telegram: ${error.message}`);
            }

            const result = fs.readFileSync(outputPath);
            if (result.length <= TELEGRAM_VIDEO_STICKER_LIMIT) {
                return result;
            }
        }
    } finally {
        for (const filePath of [inputPath, outputPath]) {
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                if (error.code !== "ENOENT") {
                    console.warn(`[STICKER_HELPER] Não foi possível remover arquivo temporário ${filePath}:`, error.message);
                }
            }
        }
    }

    throw new Error("A figurinha de vídeo do Telegram excede o limite de 256 KB mesmo após a compressão.");
}

function getAnimationDurationSeconds(metadata) {
    const delays = Array.isArray(metadata.delay)
        ? metadata.delay
        : Number.isFinite(metadata.delay) ? [metadata.delay] : [];
    return delays.reduce((total, delay) => total + delay, 0) / 1000;
}

async function createStaticWebp(inputBuffer, mode, maxSizeBytes) {
    const normalizedInput = await sharp(inputBuffer, {
        limitInputPixels: false,
        failOn: "none"
    }).rotate().toBuffer();
    const normalizedMetadata = await sharp(normalizedInput, { failOn: "none" }).metadata();
    let image = sharp(normalizedInput, {
        limitInputPixels: false,
        failOn: "none"
    });

    if (mode === "cover") {
        const width = Number(normalizedMetadata.width);
        const height = Number(normalizedMetadata.height);
        if (!width || !height) {
            throw new Error("Não foi possível identificar as dimensões da imagem.");
        }

        const side = Math.min(width, height);
        image = image.extract({
            left: Math.floor((width - side) / 2),
            top: Math.floor((height - side) / 2),
            width: side,
            height: side
        });
    }

    const resizeOptions = mode === "cover"
        ? { fit: "fill" }
        : {
            fit: mode,
            background: mode === "contain" ? { r: 0, g: 0, b: 0, alpha: 0 } : undefined
        };

    for (const quality of [80, 65, 50, 35, 20]) {
        const result = await image.clone()
            .resize(512, 512, resizeOptions)
            .webp({ quality })
            .toBuffer();
        if (result.length <= maxSizeBytes) return result;
    }

    throw createStickerError(
        `A figurinha estática excede o limite de ${Math.round(maxSizeBytes / 1024)} KB do WhatsApp mesmo após a compressão.`,
        "STICKER_SIZE_LIMIT"
    );
}

/**
 * Converte um Buffer de mídia (imagem, GIF, sticker) em um Buffer de figurinha WebP (512x512) com metadados EXIF.
 * @param {Buffer} inputBuffer 
 * @param {Object} options 
 * @param {string} [options.mode="contain"] - "contain" (proporção), "fill" (esticar), "cover" (cortar centro)
 * @param {string} [options.packName="Sat Bot"] - Nome do pacote de figurinhas
 * @param {string} [options.authorName] - Nome configurado do bot ou autor personalizado
 * @returns {Promise<Buffer>}
 */
async function createStickerBuffer(inputBuffer, options = {}) {
    if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
        throw new Error("Buffer de imagem/vídeo inválido ou vazio.");
    }

    const mimeType = String(options.mimeType || "").toLowerCase();
    const mediaType = String(options.type || "").toLowerCase();
    const mode = options.mode || "contain"; // "contain", "fill", "cover"
    const whatsappLimits = options.platform === "whatsapp";
    const durationSeconds = Number(options.durationSeconds);

    if (whatsappLimits &&
        Number.isFinite(durationSeconds) &&
        durationSeconds > WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT) {
        throw createStickerError(
            `GIFs e vídeos para figurinhas do WhatsApp podem ter no máximo ${WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT} segundos.`,
            "STICKER_DURATION_LIMIT"
        );
    }

    const isVideo = mediaType === "video" || mimeType.startsWith("video/");
    const isGif = mediaType === "gif" || mimeType.includes("gif");
    let inputMetadata = null;
    if (!isVideo) {
        inputMetadata = await sharp(inputBuffer, {
            animated: true,
            limitInputPixels: false,
            failOn: "none"
        }).metadata();
    }

    const isAnimated = isVideo ||
        isGif ||
        Boolean(options.animated) ||
        (Number(inputMetadata?.pages) || 1) > 1;
    const maxSizeBytes = whatsappLimits
        ? (isAnimated ? WHATSAPP_ANIMATED_STICKER_LIMIT : WHATSAPP_STATIC_STICKER_LIMIT)
        : Infinity;

    if (whatsappLimits && isGif && inputMetadata) {
        const duration = getAnimationDurationSeconds(inputMetadata);
        if (duration > WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT) {
            throw createStickerError(
                `GIFs e vídeos para figurinhas do WhatsApp podem ter no máximo ${WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT} segundos.`,
                "STICKER_DURATION_LIMIT"
            );
        }
    }

    let webpResult = isAnimated
        ? await convertAnimatedToWebp(inputBuffer, mode, maxSizeBytes)
        : await createStaticWebp(inputBuffer, mode, maxSizeBytes);

    if (!Buffer.isBuffer(webpResult) || webpResult.length < 16) {
        throw new Error("A conversão da mídia não gerou uma figurinha válida.");
    }

    const resultMetadata = await sharp(webpResult, { failOn: "none" }).metadata();
    if (resultMetadata.format !== "webp" || !resultMetadata.width || !resultMetadata.height) {
        throw new Error("A conversão não gerou um WebP válido para figurinha.");
    }
    if (whatsappLimits && isAnimated && getAnimationDurationSeconds(
        await sharp(webpResult, { animated: true, failOn: "none" }).metadata()
    ) > WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT) {
        throw createStickerError(
            `GIFs e vídeos para figurinhas do WhatsApp podem ter no máximo ${WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT} segundos.`,
            "STICKER_DURATION_LIMIT"
        );
    }

    // O EXIF customizado pode ser aceito pelo sharp, mas causar renderização
    // vazia em algumas versões do WhatsApp. O envio padrão usa WebP puro.
    const stickerBuffer = options.addMetadata === true
        ? addExifToWebp(webpResult, options.packName || config.getBotName(), options.authorName || config.getBotName())
        : webpResult;
    const stickerMetadata = await sharp(stickerBuffer, { failOn: "none" }).metadata();
    if (stickerMetadata.format !== "webp" || !stickerMetadata.width || !stickerMetadata.height) {
        throw new Error("A figurinha final ficou inválida após a aplicação dos metadados.");
    }
    if (whatsappLimits && stickerBuffer.length > maxSizeBytes) {
        throw createStickerError(
            `A figurinha excede o limite de ${Math.round(maxSizeBytes / 1024)} KB do WhatsApp.`,
            "STICKER_SIZE_LIMIT"
        );
    }

    return stickerBuffer;
}

async function createTelegramSticker(inputBuffer, options = {}) {
    if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
        throw new Error("Buffer de imagem/vídeo inválido ou vazio.");
    }

    const mimeType = String(options.mimeType || "").toLowerCase();
    const mediaType = String(options.type || "").toLowerCase();
    const isVideo = mediaType === "video" || mimeType.startsWith("video/");
    const isGif = mediaType === "gif" || mimeType.includes("gif");
    const inputMetadata = isVideo ? null : await sharp(inputBuffer, {
        animated: true,
        limitInputPixels: false,
        failOn: "none"
    }).metadata();
    const isAnimated = isVideo ||
        isGif ||
        Boolean(options.animated) ||
        (Number(inputMetadata?.pages) || 1) > 1;

    if (isAnimated) {
        return {
            buffer: await createTelegramVideoStickerBuffer(inputBuffer, options.mode || "contain"),
            format: "video"
        };
    }

    return {
        buffer: await createStickerBuffer(inputBuffer, { ...options, platform: "telegram" }),
        format: "static"
    };
}

/**
 * Injeta ou substitui o bloco de metadados EXIF (PackName e AuthorName) em um Buffer de figurinha WebP.
 * @param {Buffer} buffer 
 * @param {string} packName 
 * @param {string} authorName 
 * @returns {Buffer}
 */
function addExifToWebp(buffer, packName = config.getBotName(), authorName = config.getBotName()) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return buffer;

    const json = JSON.stringify({
        "sticker-pack-id": "com.satela.bot",
        "sticker-pack-name": String(packName || "Sat Bot"),
        "sticker-pack-publisher": String(authorName || config.getBotName()),
        "emojis": ["📌"]
    });

    const jsonBuffer = Buffer.from(json, "utf8");

    const exifHeader = Buffer.from([
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header
        0x01, 0x00, // 1 tag
        0x41, 0x57, // Tag 0x5741 ("WA")
        0x07, 0x00  // Type 7
    ]);
    const countBuffer = Buffer.alloc(4);
    countBuffer.writeUInt32LE(jsonBuffer.length, 0);

    const offsetBuffer = Buffer.from([0x1A, 0x00, 0x00, 0x00]); // 26 bytes a partir do início da TIFF
    const nextIfdBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);

    const exifData = Buffer.concat([exifHeader, countBuffer, offsetBuffer, nextIfdBuffer, jsonBuffer]);

    const exifChunkHeader = Buffer.alloc(8);
    exifChunkHeader.write("EXIF", 0);
    exifChunkHeader.writeUInt32LE(exifData.length, 4);

    const padding = exifData.length % 2 !== 0 ? Buffer.from([0x00]) : Buffer.alloc(0);
    const fullExifChunk = Buffer.concat([exifChunkHeader, exifData, padding]);

    const riffHeader = buffer.slice(0, 4).toString("ascii");
    const webpHeader = buffer.slice(8, 12).toString("ascii");

    if (riffHeader !== "RIFF" || webpHeader !== "WEBP") {
        return buffer;
    }

    let pos = 12;
    const chunks = [];
    while (pos < buffer.length) {
        if (pos + 8 > buffer.length) break;
        const fourcc = buffer.slice(pos, pos + 4).toString("ascii");
        const chunkSize = buffer.readUInt32LE(pos + 4);
        const totalChunkSize = 8 + chunkSize + (chunkSize % 2);

        if (fourcc !== "EXIF") {
            chunks.push(buffer.slice(pos, Math.min(pos + totalChunkSize, buffer.length)));
        }
        pos += totalChunkSize;
    }

    chunks.push(fullExifChunk);

    const bodyBuffer = Buffer.concat(chunks);
    const newRiffHeader = Buffer.alloc(12);
    newRiffHeader.write("RIFF", 0);
    newRiffHeader.writeUInt32LE(bodyBuffer.length + 4, 4);
    newRiffHeader.write("WEBP", 8);

    return Buffer.concat([newRiffHeader, bodyBuffer]);
}

module.exports = {
    createStickerBuffer,
    createTelegramSticker,
    addExifToWebp
};
