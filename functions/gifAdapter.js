const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

let ffmpegPath;
try {
    ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
} catch {
    ffmpegPath = "ffmpeg";
}

function detectBufferFormat(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
        return { ext: "bin", mime: "application/octet-stream", type: "unknown" };
    }
    const header3 = buffer.slice(0, 3).toString("ascii");
    const header6 = buffer.slice(0, 6).toString("ascii");
    if (header3 === "GIF" || header6.startsWith("GIF8")) {
        return { ext: "gif", mime: "image/gif", type: "gif", isRealGif: true };
    }
    const ftyp = buffer.slice(4, 8).toString("ascii");
    if (ftyp === "ftyp" || ftyp === "moov" || buffer.slice(4, 12).toString("ascii").includes("mp4")) {
        return { ext: "mp4", mime: "video/mp4", type: "video", isMp4: true };
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return { ext: "png", mime: "image/png", type: "photo" };
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return { ext: "jpg", mime: "image/jpeg", type: "photo" };
    }
    if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") {
        return { ext: "webp", mime: "image/webp", type: "photo" };
    }
    return { ext: "bin", mime: "application/octet-stream", type: "unknown" };
}

function convertGifToMp4(gifBuffer) {
    if (!detectBufferFormat(gifBuffer).isRealGif) {
        return Promise.reject(new Error("O buffer informado não é uma imagem GIF."));
    }

    return new Promise((resolve, reject) => {
        const id = `satbot_gif_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const inputPath = path.join(os.tmpdir(), `${id}.gif`);
        const outputPath = path.join(os.tmpdir(), `${id}.mp4`);
        const args = [
            "-y",
            "-i", inputPath,
            "-movflags", "faststart",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=ceil(iw/2)*2:ceil(ih/2)*2",
            "-loop", "0",
            "-an",
            outputPath
        ];

        try {
            fs.writeFileSync(inputPath, gifBuffer);
        } catch (error) {
            return reject(new Error(`Não foi possível preparar o GIF para conversão: ${error.message}`));
        }

        execFile(ffmpegPath, args, { timeout: 30000 }, error => {
            try { fs.unlinkSync(inputPath); } catch {}
            if (error) {
                try { fs.unlinkSync(outputPath); } catch {}
                return reject(new Error(`ffmpeg falhou ao converter GIF para MP4: ${error.message}`));
            }

            try {
                const mp4Buffer = fs.readFileSync(outputPath);
                fs.unlinkSync(outputPath);
                if (mp4Buffer.length < 100 || !detectBufferFormat(mp4Buffer).isMp4) {
                    return reject(new Error("ffmpeg gerou um MP4 vazio ou inválido."));
                }
                resolve(mp4Buffer);
            } catch (readError) {
                try { fs.unlinkSync(outputPath); } catch {}
                reject(new Error(`Não foi possível ler o MP4 convertido: ${readError.message}`));
            }
        });
    });
}

module.exports = { detectBufferFormat, convertGifToMp4 };
