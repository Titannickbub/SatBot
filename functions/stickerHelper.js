const sharp = require("sharp");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const config = require("./config");

const execFileAsync = promisify(execFile);
const WHATSAPP_STATIC_STICKER_LIMIT = 100 * 1024;
const WHATSAPP_ANIMATED_STICKER_LIMIT = 1024 * 1024;
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

function getResizeFilter(mode, size = 512) {
    if (mode === "fill") {
        return `scale=${size}:${size}`;
    }
    if (mode === "cover") {
        return `scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size}`;
    }
    return `scale=${size}:${size}:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`;
}

async function probeVideoDuration(inputPath) {
    try {
        const { stdout } = await execFileAsync(getFfmpegPath(), [
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            "-i", inputPath
        ], { timeout: 15000, windowsHide: true }).catch(() => ({ stdout: "" }));
        // ffmpeg probe via -i e stderr parse como fallback
        const dur = parseFloat(stdout.trim());
        if (Number.isFinite(dur) && dur > 0) return dur;
    } catch {}
    // Fallback: tenta via stderr do ffmpeg -i
    try {
        const ffprobeLike = await execFileAsync(getFfmpegPath(), [
            "-v", "quiet", "-print_format", "json",
            "-show_streams", "-i", inputPath
        ], { timeout: 15000, windowsHide: true }).catch(e => ({ stderr: e.stderr || "" }));
        const durationMatch = (ffprobeLike.stderr || "").match(/Duration:\s*([\d:.]+)/);
        if (durationMatch) {
            const parts = durationMatch[1].split(":").map(Number);
            return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        }
    } catch {}
    return null;
}

async function convertAnimatedToWebp(inputBuffer, mode, maxSizeBytes, durationLimitSeconds) {
    const tempId = `sticker_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `${tempId}.media`);
    const outputPath = path.join(tempDir, `${tempId}.webp`);
    const attempts = [
        { size: 512, fps: 15, quality: 70 },
        { size: 512, fps: 12, quality: 60 },
        { size: 512, fps: 10, quality: 50 },
        { size: 512, fps: 8, quality: 40 },
        { size: 512, fps: 6, quality: 30 },
        { size: 448, fps: 10, quality: 35 },
        { size: 448, fps: 8, quality: 30 },
        { size: 384, fps: 10, quality: 30 },
        { size: 384, fps: 8, quality: 25 },
        { size: 320, fps: 10, quality: 25 },
        { size: 320, fps: 8, quality: 20 },
        { size: 256, fps: 8, quality: 20 },
        { size: 256, fps: 6, quality: 15 }
    ];

    try {
        fs.writeFileSync(inputPath, inputBuffer);

        // Probe a duração real do arquivo para decidir se bloqueia antes de converter
        if (durationLimitSeconds != null) {
            const realDuration = await probeVideoDuration(inputPath);
            if (realDuration != null && realDuration > durationLimitSeconds) {
                throw createStickerError(
                    `GIFs e vídeos para figurinhas do WhatsApp podem ter no máximo ${durationLimitSeconds} segundos (duração detectada: ${Math.ceil(realDuration)}s).`,
                    "STICKER_DURATION_LIMIT"
                );
            }
        }

        const tArgs = durationLimitSeconds != null
            ? ["-t", String(durationLimitSeconds)]
            : [];

        for (const attempt of attempts) {
            try {
                await execFileAsync(getFfmpegPath(), [
                    "-y",
                    "-i", inputPath,
                    ...tArgs,
                    "-an",
                    "-vf", `fps=${attempt.fps},${getResizeFilter(mode, attempt.size)}`,
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

    const limitLabel = maxSizeBytes >= 1024 * 1024
        ? `${Math.round(maxSizeBytes / (1024 * 1024))} MB`
        : `${Math.round(maxSizeBytes / 1024)} KB`;
    throw createStickerError(
        `A figurinha animada excede o limite de ${limitLabel} do WhatsApp mesmo após a compressão.`,
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
        ? { fit: "cover" }
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

    // Não bloqueia aqui — a duração real é checada dentro de convertAnimatedToWebp via probe do ffmpeg.

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
    const conversionMaxSizeBytes = options.addMetadata === true && whatsappLimits
        ? maxSizeBytes - 512
        : maxSizeBytes;

    // Para GIFs, checa duração antes (via sharp metadata). Videos são checados dentro do convertAnimatedToWebp via probe.
    if (whatsappLimits && isGif && inputMetadata) {
        const duration = getAnimationDurationSeconds(inputMetadata);
        if (duration > WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT) {
            throw createStickerError(
                `GIFs e vídeos para figurinhas do WhatsApp podem ter no máximo ${WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT} segundos.`,
                "STICKER_DURATION_LIMIT"
            );
        }
    }

    const durationLimit = (whatsappLimits && isAnimated && !isGif)
        ? WHATSAPP_ANIMATED_STICKER_DURATION_LIMIT
        : null;

    let webpResult = isAnimated
        ? await convertAnimatedToWebp(inputBuffer, mode, conversionMaxSizeBytes, durationLimit)
        : await createStaticWebp(inputBuffer, mode, conversionMaxSizeBytes);

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

    // EXIF é opt-in porque alguns clientes do WhatsApp podem renderizar stickers com metadados incorretamente.
    const stickerBuffer = options.addMetadata === true
        ? await addExifToWebp(
            webpResult,
            options.packName || config.getBotName(),
            options.authorName || config.getBotName(),
            options.description
        )
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
 * Injeta ou substitui o bloco de metadados EXIF do pacote em um Buffer de figurinha WebP.
 * Utiliza o node-webpmux (padrão oficial libwebp / Aleatory) com o TIFF header canônico (22 bytes).
 * @param {Buffer} buffer 
 * @param {string} packName 
 * @param {string} authorName 
 * @param {string} description 
 * @returns {Promise<Buffer>}
 */
async function addExifToWebp(
    buffer,
    packName = config.getBotName(),
    authorName = config.getBotName(),
    description = config.getStickerConfig?.().description
) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return buffer;

    const json = {
        "sticker-pack-id": "com.satela.bot",
        "sticker-pack-name": String(packName || "Sat Bot"),
        "sticker-pack-publisher": String(authorName || config.getBotName()),
        "sticker-pack-description": String(description || ""),
        "emojis": ["📌"]
    };

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    try {
        const webp = require("node-webpmux");
        const img = new webp.Image();
        await img.load(buffer);
        img.exif = exif;
        return await img.save(null);
    } catch (err) {
        console.warn("[STICKER_HELPER] Erro ao injetar EXIF via node-webpmux:", err.message);
        return buffer;
    }
}

module.exports = {
    createStickerBuffer,
    createTelegramSticker,
    addExifToWebp
};
