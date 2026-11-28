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

async function probeVideoFps(inputPath) {
    try {
        const { stdout, stderr } = await execFileAsync(getFfmpegPath(), [
            "-i", inputPath
        ], { timeout: 15000, windowsHide: true }).catch(err => ({
            stdout: err.stdout || "",
            stderr: err.stderr || ""
        }));
        const combined = String(stderr || "") + "\n" + String(stdout || "");
        const match = combined.match(/,\s*([\d.]+)\s*fps/) || combined.match(/,\s*([\d.]+)\s*tbr/);
        if (match) {
            const parsed = parseFloat(match[1]);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }
    } catch {}
    return null;
}

/**
 * Substitui placeholders em textos de pacote, autor ou descrição da figurinha.
 * Placeholders suportados:
 * {user} - Nome do usuário que gerou a figurinha
 * {n_user} - Número do usuário quando aplicável
 * {name_bot} - Nome configurado do bot
 * {n_bot} - Número conectado ao bot
 * {namechat} - Número do grupo que gerou a figurinha (ou {n_chat})
 * {name_chat} / {group} - Nome do grupo quando disponível
 *
 * @param {string} text 
 * @param {Object} [message={}] 
 * @param {string} [botNameFallback] 
 * @returns {string}
 */
function formatStickerPlaceholders(text, message = {}, botNameFallback = null) {
    if (typeof text !== "string" || !text) return text || "";

    // Normaliza quebras de linha e converte literais \n em quebras reais
    text = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\\r\\n/g, "\n")
        .replace(/\\n/g, "\n");

    const botName = botNameFallback || (typeof config.getBotName === "function" ? config.getBotName() : "Sat Bot");

    // {user}: nome do usuário que fez a figurinha
    const user = message.displayName ||
        message.username ||
        message.raw?.pushName ||
        message.sender?.name ||
        "Usuário";

    // {n_user}: número do usuário quando aplicável
    let nUser = "";
    const rawUserId = String(
        message.userId ||
        message.sender?.id ||
        message.raw?.key?.participant ||
        ""
    );
    if (rawUserId) {
        nUser = rawUserId.split("@")[0].split(":")[0].replace(/\D/g, "");
    }

    // {name_bot}: nome configurado do bot
    const nameBot = botName || "Sat Bot";

    // {n_bot}: número conectado ao bot
    let nBot = "";
    if (message.botNumber) {
        nBot = String(message.botNumber).replace(/\D/g, "");
    } else if (message.botId) {
        nBot = String(message.botId).split("@")[0].split(":")[0].replace(/\D/g, "");
    } else if (global.whatsappSock?.user?.id) {
        nBot = String(global.whatsappSock.user.id).split("@")[0].split(":")[0].replace(/\D/g, "");
    }

    // {namechat}: número do grupo que gerou a figurinha
    let namechat = "";
    const isGroup = message.chatType === "group" ||
        String(message.chatId || "").endsWith("@g.us") ||
        Boolean(message.groupId);
    if (isGroup) {
        const rawChatId = String(message.chatId || message.groupId || "");
        namechat = rawChatId.split("@")[0].replace(/^-100/, "").replace(/^-/, "").replace(/\D/g, "");
    }

    const groupName = message.groupName || message.chatName || namechat || "";

    return text
        .replace(/\{user\}/gi, user)
        .replace(/\{n_user\}/gi, nUser)
        .replace(/\{name_bot\}/gi, nameBot)
        .replace(/\{n_bot\}/gi, nBot)
        .replace(/\{namechat\}/gi, namechat)
        .replace(/\{n_chat\}/gi, namechat)
        .replace(/\{name_chat\}/gi, groupName)
        .replace(/\{group\}/gi, groupName);
}

async function convertAnimatedToWebp(inputBuffer, mode, maxSizeBytes, durationLimitSeconds) {
    const tempId = `sticker_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `${tempId}.media`);
    const outputPath = path.join(tempDir, `${tempId}.webp`);

    try {
        fs.writeFileSync(inputPath, inputBuffer);

        // Detecta o FPS da mídia original e preserva sem reduzir o framerate
        // Capped em no máximo 20 fps para manter suavidade sem gerar arquivos gigantes
        const detectedFps = await probeVideoFps(inputPath);
        const targetFps = detectedFps
            ? Math.min(Math.max(Math.round(detectedFps), 8), 20)
            : 18;

        // Reduz a resolução e a qualidade nas tentativas sucessivas sem perder o FPS
        const attempts = [
            { size: 512, quality: 40 },
            { size: 400, quality: 30 },
            { size: 320, quality: 25 },
            { size: 256, quality: 20 },
            { size: 200, quality: 15 },
            { size: 160, quality: 10 },
            { size: 128, quality: 10 }
        ];

        // Se o vídeo for maior que o limite (10s no WhatsApp), usa os 10 primeiros segundos automaticamente
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
                    "-vf", `fps=${targetFps},${getResizeFilter(mode, attempt.size)}`,
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
        ? { fit: "fill" }
        : {
            fit: mode,
            background: mode === "contain" ? { r: 0, g: 0, b: 0, alpha: 0 } : undefined
        };

    // Reduz a qualidade de cara para compactar rápido
    const attempts = [
        { size: 512, quality: 50 },
        { size: 512, quality: 25 },
        { size: 384, quality: 15 }
    ];

    for (const attempt of attempts) {
        const result = await image.clone()
            .resize(attempt.size, attempt.size, resizeOptions)
            .webp({ quality: attempt.quality })
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

    // Para WhatsApp: GIFs e vídeos de mais de 10s usam automaticamente os primeiros 10 segundos
    const durationLimit = (whatsappLimits && isAnimated)
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

    // EXIF é aplicado via node-webpmux garantindo integridade de cabeçalho VP8X para fotos e vídeos
    const messageContext = options.message || {};
    const resolvedPack = formatStickerPlaceholders(options.packName || config.getBotName(), messageContext);
    const resolvedAuthor = formatStickerPlaceholders(options.authorName || config.getBotName(), messageContext);
    const resolvedDesc = formatStickerPlaceholders(options.description, messageContext);

    const stickerBuffer = options.addMetadata === true
        ? await addExifToWebp(
            webpResult,
            resolvedPack,
            resolvedAuthor,
            resolvedDesc,
            messageContext
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

    const messageContext = options.message || {};
    const resolvedPack = formatStickerPlaceholders(options.packName, messageContext);
    const resolvedAuthor = formatStickerPlaceholders(options.authorName, messageContext);
    const resolvedDesc = formatStickerPlaceholders(options.description, messageContext);

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
        buffer: await createStickerBuffer(inputBuffer, {
            ...options,
            packName: resolvedPack,
            authorName: resolvedAuthor,
            description: resolvedDesc,
            platform: "telegram"
        }),
        format: "static"
    };
}

/**
 * Injeta ou substitui o bloco de metadados EXIF do pacote em um Buffer de figurinha WebP.
 * Utiliza o node-webpmux (padrão oficial libwebp) garantindo cabeçalho VP8X válido para fotos e vídeos,
 * evitando que figurinhas saiam quebradas ou deixem de exibir a mídia em clientes WhatsApp.
 * @param {Buffer} buffer 
 * @param {string} packName 
 * @param {string} authorName 
 * @param {string} description 
 * @param {Object} [messageContext={}]
 * @returns {Promise<Buffer>}
 */
async function addExifToWebp(
    buffer,
    packName = config.getBotName(),
    authorName = config.getBotName(),
    description = config.getStickerConfig?.().description,
    messageContext = {}
) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return buffer;

    try {
        const webpmux = require("node-webpmux");
        const img = new webpmux.Image();
        await img.load(buffer);

        const finalPack = formatStickerPlaceholders(packName || config.getBotName(), messageContext);
        const finalAuthor = formatStickerPlaceholders(authorName || config.getBotName(), messageContext);
        const finalDesc = formatStickerPlaceholders(description, messageContext);

        const json = JSON.stringify({
            "sticker-pack-id": "com.satela.bot",
            "sticker-pack-name": String(finalPack || "Sat Bot"),
            "sticker-pack-publisher": String(finalAuthor || config.getBotName()),
            "sticker-pack-description": String(finalDesc || ""),
            "emojis": ["📌"]
        });

        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00, 0x00, 0x00
        ]);
        const jsonBuffer = Buffer.from(json, "utf8");
        exifAttr.writeUIntLE(jsonBuffer.length, 14, 4);
        img.exif = Buffer.concat([exifAttr, jsonBuffer]);

        return await img.save(null);
    } catch (err) {
        console.warn("[STICKER_HELPER] Falha ao adicionar EXIF via webpmux:", err.message || err);
        return buffer;
    }
}

module.exports = {
    createStickerBuffer,
    createTelegramSticker,
    addExifToWebp,
    formatStickerPlaceholders,
    probeVideoFps
};
