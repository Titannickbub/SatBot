const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const VIDEO_EXTENSIONS = new Set(["3gp", "avi", "mkv", "mov", "mp4", "webm"]);
const AUDIO_EXTENSIONS = new Set(["aac", "flac", "m4a", "mp3", "ogg", "opus", "wav"]);
const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "heic", "heif", "jpeg", "jpg", "png", "tif", "tiff", "webp"]);

let ffmpegPath;
try {
    ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
} catch {
    ffmpegPath = "ffmpeg";
}

function getMediaType(media) {
    const type = String(media?.type || "").toLowerCase();
    const mimeType = String(media?.mimeType || "").toLowerCase();
    const fileName = String(media?.fileName || "");
    const extension = path.extname(fileName).slice(1).toLowerCase();

    if (type === "audio" || mimeType.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension)) {
        return "audio";
    }
    if (type === "video" || mimeType.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) {
        return "video";
    }
    if (type === "image" || type === "photo" || mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
        return "image";
    }
    return null;
}

function getInputExtension(media, type) {
    const extension = path.extname(String(media.fileName || "")).slice(1).toLowerCase();
    const allowedExtensions = type === "audio"
        ? AUDIO_EXTENSIONS
        : type === "image"
            ? IMAGE_EXTENSIONS
            : VIDEO_EXTENSIONS;
    if (allowedExtensions.has(extension)) return extension;

    const mimeType = String(media.mimeType || "").toLowerCase();
    const mimeExtensions = {
        "audio/aac": "aac",
        "audio/flac": "flac",
        "audio/mp3": "mp3",
        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/ogg": "ogg",
        "audio/opus": "opus",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "image/avif": "avif",
        "image/bmp": "bmp",
        "image/gif": "gif",
        "image/heic": "heic",
        "image/heif": "heif",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/tiff": "tiff",
        "image/webp": "webp",
        "video/3gpp": "3gp",
        "video/mp4": "mp4",
        "video/quicktime": "mov",
        "video/webm": "webm",
        "video/x-msvideo": "avi",
        "video/x-matroska": "mkv"
    };
    const mimeExtension = mimeExtensions[mimeType];
    if (mimeExtension && allowedExtensions.has(mimeExtension)) return mimeExtension;
    if (type === "audio") return "ogg";
    if (type === "image") return "jpg";
    return "mp4";
}

function getMultiplier(message, effect) {
    const args = Array.isArray(message.args) ? message.args.map(arg => String(arg).toLowerCase()) : [];
    if (args.length === 0) return 1;
    if (args.length === 1 && args[0] === "2x" && effect.supportsMultiplier !== false) return 2;
    return null;
}

function parseMediaTime(value) {
    const normalized = String(value || "").replace(",", ".");
    if (/^\d+(?:\.\d+)?$/.test(normalized)) {
        const seconds = Number(normalized);
        return Number.isFinite(seconds) ? seconds : null;
    }

    const parts = normalized.split(":");
    if (parts.length < 2 || parts.length > 3 || parts.some(part => !/^\d+(?:\.\d+)?$/.test(part))) {
        return null;
    }
    const values = parts.map(Number);
    if (values.slice(1).some(part => part >= 60)) return null;
    const seconds = values.length === 2
        ? values[0] * 60 + values[1]
        : values[0] * 3600 + values[1] * 60 + values[2];
    return Number.isFinite(seconds) ? seconds : null;
}

function createAtempoFilter(rate) {
    const filters = [];
    let remainingRate = rate;
    while (remainingRate > 2) {
        filters.push("atempo=2");
        remainingRate /= 2;
    }
    while (remainingRate < 0.5) {
        filters.push("atempo=0.5");
        remainingRate /= 0.5;
    }
    filters.push(`atempo=${remainingRate}`);
    return filters.join(",");
}

function createBassDuckingFilter(gain) {
    return [
        "[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asplit=2[bandin][keyin]",
        "[bandin]acrossover=split=250|4000:order=1[low][mid][high]",
        `[low]bass=g=${gain}:f=120:w=0.7,alimiter=limit=0.95[bass]`,
        "[high]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[highfmt]",
        "[keyin]lowpass=f=180,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[sc]",
        "[highfmt][sc]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=500[ducked]",
        "[bass][mid][ducked]amix=inputs=3:weights=1 1 1,volume=3[processed]"
    ].join(";");
}

function getEffectFilters(effect, multiplier) {
    if (effect.grayscale) {
        return { videoFilter: "hue=s=0" };
    }
    if (effect.saturationIncrease) {
        const saturation = 1 + effect.saturationIncrease * multiplier;
        return { videoFilter: `eq=saturation=${saturation}` };
    }
    if (effect.mirrorFilter || effect.rotateFilter) {
        return { videoFilter: effect.mirrorFilter || effect.rotateFilter };
    }
    if (effect.reverse) {
        return {
            audioFilter: "areverse",
            videoFilter: "reverse"
        };
    }
    if (effect.maximizeVolume) {
        return { audioFilter: "dynaudnorm=f=150:g=15:p=0.95" };
    }
    if (effect.distortion) {
        return {
            audioFilter: multiplier === 2
                ? "acrusher=level_in=16:level_out=1:bits=6:mix=1"
                : "acrusher=level_in=8:level_out=1:bits=8:mix=0.5"
        };
    }
    if (effect.speedRate) {
        const rate = multiplier === 2 ? effect.speedRate2x : effect.speedRate;
        return {
            audioFilter: createAtempoFilter(rate),
            videoFilter: `setpts=${1 / rate}*PTS`
        };
    }
    if (effect.pitchRatio) {
        const pitchRatio = effect.pitchRatio ** multiplier;
        return {
            audioFilter: `asetrate=44100*${pitchRatio},aresample=44100,${createAtempoFilter(1 / pitchRatio)}`
        };
    }
    if (effect.bassGain) {
        return {
            audioComplexFilter: createBassDuckingFilter(effect.bassGain * multiplier)
        };
    }
    return {};
}

function buildFfmpegArgs(inputPath, outputPath, type, effect) {
    const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", inputPath];

    if (effect.gif) {
        const { start, duration } = effect.gif;
        const filter = "[0:v]fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer";
        return args.concat([
            "-ss", String(start),
            "-t", String(duration),
            "-an",
            "-filter_complex", filter,
            "-loop", "0",
            "-f", "gif",
            outputPath
        ]);
    }

    if (effect.trim) {
        args.push("-ss", String(effect.trim.start), "-t", String(effect.trim.duration));
    }

    if (type === "image") {
        return args.concat([
            "-frames:v", "1",
            "-vf", effect.videoFilter,
            "-q:v", "2",
            outputPath
        ]);
    }

    if (effect.extractAudio) {
        const audioArgs = [
            "-map", "0:a:0",
            "-vn",
            "-c:a", "libmp3lame",
            "-q:a", "2",
        ];
        if (effect.audioFilter) audioArgs.push("-af", effect.audioFilter);
        audioArgs.push(outputPath);
        return args.concat(audioArgs);
    }

    if (type === "audio") {
        if (effect.audioComplexFilter) {
            return args.concat([
                "-filter_complex", effect.audioComplexFilter,
                "-map", "[processed]",
                "-vn",
                "-c:a", "libmp3lame",
                "-q:a", "2",
                outputPath
            ]);
        }

        const audioArgs = [
            "-map", "0:a:0",
            "-vn",
            "-c:a", "libmp3lame",
            "-q:a", "2",
        ];
        if (effect.audioFilter) audioArgs.splice(3, 0, "-af", effect.audioFilter);
        audioArgs.push(outputPath);
        return args.concat(audioArgs);
    }

    args.push("-map", "0:v:0?");
    if (effect.videoFilter) {
        args.push(
            "-vf", effect.videoFilter,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-pix_fmt", "yuv420p"
        );
    } else {
        args.push("-c:v", "copy");
    }

    if (effect.audioComplexFilter) {
        args.push(
            "-filter_complex", effect.audioComplexFilter,
            "-map", "[processed]",
            "-c:a", "aac",
            "-b:a", "192k"
        );
    } else if (effect.audioFilter) {
        args.push("-af", effect.audioFilter, "-c:a", "aac", "-b:a", "192k");
    } else {
        args.push("-map", "0:a:0?", "-c:a", "copy");
    }

    args.push("-movflags", "+faststart", outputPath);
    return args;
}

async function editMedia(message, effect) {
    const media = message.media || message.quoted?.media;
    const mediaType = getMediaType(media);
    const parsedArgs = typeof effect.parseArgs === "function"
        ? effect.parseArgs(Array.isArray(message.args) ? message.args.map(String) : [])
        : { multiplier: getMultiplier(message, effect) };
    const multiplier = parsedArgs?.multiplier;
    if (!media || !mediaType || typeof media.getBuffer !== "function" ||
        (effect.extractAudio && mediaType !== "video") ||
        (Array.isArray(effect.allowedMediaTypes) && !effect.allowedMediaTypes.includes(mediaType))) {
        const requirement = effect.inputDescription || (effect.extractAudio ? "um vídeo" : "um áudio ou vídeo");
        return message.reply({
            text: `❌ Envie ${requirement} junto com o comando ou responda a uma mídia compatível com \`${message.prefix}${effect.name}\`.`
        });
    }
    if (parsedArgs?.error) {
        const usage = effect.usage || `{prefix}${effect.name}`;
        return message.reply({
            text: `❌ Uso correto: ${usage.replaceAll("{prefix}", message.prefix || "!")}`
        });
    }
    if (multiplier === null) {
        const usage = effect.supportsMultiplier === false
            ? `\`${message.prefix}${effect.name}\``
            : `\`${message.prefix}${effect.name}\` ou \`${message.prefix}${effect.name} 2x\``;
        return message.reply({
            text: `❌ Opção inválida. Use ${usage}.`
        });
    }

    let tempDirectory;
    try {
        if (typeof message.react === "function") {
            await message.react("⏳");
        }
        await message.reply({
            text: `⏳ Iniciei o processamento de *${effect.label}*${multiplier === 2 ? " (2x)" : ""}. Isso pode levar alguns instantes.`
        });

        const inputBuffer = await media.getBuffer();
        if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
            throw new Error("A mídia está vazia ou não pôde ser baixada.");
        }

        tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "satbot-media-editor-"));
        const inputPath = path.join(tempDirectory, `input.${getInputExtension(media, mediaType)}`);
        const outputExtension = effect.extractAudio || mediaType === "audio"
            ? "mp3"
            : parsedArgs?.gif
                ? "gif"
            : mediaType === "image"
                ? "jpg"
                : "mp4";
        const outputPath = path.join(tempDirectory, `output.${outputExtension}`);
        const processedEffect = {
            ...effect,
            ...parsedArgs,
            ...getEffectFilters({ ...effect, ...parsedArgs }, multiplier)
        };
        await fs.promises.writeFile(inputPath, inputBuffer);

        await execFileAsync(
            ffmpegPath,
            buildFfmpegArgs(inputPath, outputPath, mediaType, processedEffect),
            { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
        );

        const outputBuffer = await fs.promises.readFile(outputPath);
        if (outputBuffer.length === 0) {
            throw new Error("O FFmpeg gerou um arquivo vazio.");
        }

        const fileName = `${effect.name}.${outputExtension}`;
        const caption = `✅ Mídia processada: ${effect.label}${multiplier === 2 ? " (2x)" : ""}.`;
        if (outputExtension === "mp3") {
            return await message.replyAudio({ audio: outputBuffer, caption, filename: fileName });
        }
        if (mediaType === "image") {
            return await message.replyImg({ image: outputBuffer, caption, fileName });
        }
        if (outputExtension === "gif") {
            return await message.replyFile({
                file: outputBuffer,
                filename: fileName,
                fileName,
                mimetype: "image/gif",
                caption
            });
        }
        return await message.replyVideo({ video: outputBuffer, caption, fileName });
    } catch (error) {
        console.error(`[MEDIA_EDITOR:${effect.name}] Falha ao processar mídia:`, error);
        return message.reply({
            text: `❌ Não foi possível processar essa mídia com \`${message.prefix}${effect.name}\`. Verifique se o arquivo tem áudio e está em um formato compatível.`
        });
    } finally {
        if (tempDirectory) {
            try {
                await fs.promises.rm(tempDirectory, { recursive: true, force: true });
            } catch (error) {
                console.error("[MEDIA_EDITOR] Não foi possível remover arquivos temporários:", error);
            }
        }
    }
}

module.exports = { editMedia, parseMediaTime };
