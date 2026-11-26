const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const MAX_AUDIO_STICKER_SECONDS = 30;
const WAVEFORM_SAMPLE_RATE = 8000;
const WAVEFORM_BARS = 64;

function getFfmpegPath() {
    try {
        return require("@ffmpeg-installer/ffmpeg").path;
    } catch {
        return "ffmpeg";
    }
}

function createWaveform(pcmBuffer) {
    const sampleCount = Math.floor(pcmBuffer.length / 2);
    if (sampleCount < WAVEFORM_BARS) {
        return Buffer.alloc(WAVEFORM_BARS, 10);
    }

    const blockSize = Math.floor(sampleCount / WAVEFORM_BARS);
    const averages = [];
    for (let bar = 0; bar < WAVEFORM_BARS; bar += 1) {
        let total = 0;
        const start = bar * blockSize;
        for (let sample = 0; sample < blockSize; sample += 1) {
            total += Math.abs(pcmBuffer.readInt16LE((start + sample) * 2));
        }
        averages.push(total / blockSize);
    }

    const maxAverage = Math.max(...averages);
    const scale = maxAverage > 0 ? 100 / maxAverage : 1;
    return Buffer.from(averages.map(value => Math.min(100, Math.floor(value * scale))));
}

async function createAudioStickerAudio(inputBuffer) {
    if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
        throw new Error("O áudio para a figurinha está vazio ou inválido.");
    }

    const tempId = `audio_sticker_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const inputPath = path.join(os.tmpdir(), `${tempId}.media`);
    const outputPath = path.join(os.tmpdir(), `${tempId}.ogg`);

    try {
        fs.writeFileSync(inputPath, inputBuffer);
        await execFileAsync(getFfmpegPath(), [
            "-y",
            "-v", "error",
            "-i", inputPath,
            "-vn",
            "-t", String(MAX_AUDIO_STICKER_SECONDS),
            "-ar", "48000",
            "-ac", "1",
            "-c:a", "libopus",
            "-b:a", "48k",
            "-vbr", "on",
            "-compression_level", "10",
            "-frame_duration", "20",
            "-application", "audio",
            "-avoid_negative_ts", "make_zero",
            "-map_metadata", "-1",
            "-f", "ogg",
            outputPath
        ], { timeout: 90000, windowsHide: true });

        const audioBuffer = fs.readFileSync(outputPath);
        const { stdout: pcmBuffer } = await execFileAsync(getFfmpegPath(), [
            "-v", "error",
            "-i", outputPath,
            "-ac", "1",
            "-ar", String(WAVEFORM_SAMPLE_RATE),
            "-f", "s16le",
            "pipe:1"
        ], {
            encoding: "buffer",
            maxBuffer: 5 * 1024 * 1024,
            timeout: 30000,
            windowsHide: true
        });

        const durationSeconds = Math.ceil(pcmBuffer.length / 2 / WAVEFORM_SAMPLE_RATE);
        if (!audioBuffer.length || durationSeconds < 1) {
            throw new Error("O arquivo não contém áudio compatível com uma figurinha sonora.");
        }

        return {
            buffer: audioBuffer,
            durationSeconds: Math.min(durationSeconds, MAX_AUDIO_STICKER_SECONDS),
            waveform: createWaveform(pcmBuffer)
        };
    } finally {
        for (const filePath of [inputPath, outputPath]) {
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                if (error.code !== "ENOENT") {
                    console.warn(`[AUDIO_STICKER] Não foi possível remover arquivo temporário ${filePath}:`, error.message);
                }
            }
        }
    }
}

module.exports = {
    MAX_AUDIO_STICKER_SECONDS,
    createWaveform,
    createAudioStickerAudio
};
