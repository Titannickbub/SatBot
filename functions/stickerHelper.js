const sharp = require("sharp");

/**
 * Converte um Buffer de mídia (imagem, GIF, sticker) em um Buffer de figurinha WebP (512x512) com metadados EXIF.
 * @param {Buffer} inputBuffer 
 * @param {Object} options 
 * @param {string} [options.mode="contain"] - "contain" (proporção), "fill" (esticar), "cover" (cortar centro)
 * @param {string} [options.packName="Sat Bot"] - Nome do pacote de figurinhas
 * @param {string} [options.authorName="Satela"] - Nome do autor das figurinhas
 * @returns {Promise<Buffer>}
 */
async function createStickerBuffer(inputBuffer, options = {}) {
    if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
        throw new Error("Buffer de imagem/vídeo inválido ou vazio.");
    }

    const mimeType = String(options.mimeType || "").toLowerCase();
    const mediaType = String(options.type || "").toLowerCase();
    const isAnimated = mediaType === "video" || mediaType === "gif" || mimeType.includes("gif") || mimeType.includes("webp") || Boolean(options.animated);

    const mode = options.mode || "contain"; // "contain", "fill", "cover"

    const resizeOptions = {
        fit: mode
    };

    if (mode === "contain") {
        resizeOptions.background = { r: 0, g: 0, b: 0, alpha: 0 };
    } else if (mode === "cover") {
        resizeOptions.position = "center";
    }

    let webpResult;

    if (isAnimated) {
        try {
            webpResult = await sharp(inputBuffer, { animated: true })
                .resize(512, 512, resizeOptions)
                .webp({ effort: 4, loop: 0 })
                .toBuffer();
        } catch (animErr) {
            console.warn("[STICKER_HELPER] Falha na conversão animada, tentando estática:", animErr.message || animErr);
        }
    }

    if (!webpResult) {
        // Conversão estática padrão (PNG/JPG/WebP/etc)
        webpResult = await sharp(inputBuffer)
            .resize(512, 512, resizeOptions)
            .webp({ quality: 80 })
            .toBuffer();
    }

    const packName = options.packName || "Sat Bot";
    const authorName = options.authorName || "Satela";

    return addExifToWebp(webpResult, packName, authorName);
}

/**
 * Injeta ou substitui o bloco de metadados EXIF (PackName e AuthorName) em um Buffer de figurinha WebP.
 * @param {Buffer} buffer 
 * @param {string} packName 
 * @param {string} authorName 
 * @returns {Buffer}
 */
function addExifToWebp(buffer, packName = "Sat Bot", authorName = "Satela") {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return buffer;

    const json = JSON.stringify({
        "sticker-pack-id": "com.satela.bot",
        "sticker-pack-name": String(packName || "Sat Bot"),
        "sticker-pack-publisher": String(authorName || "Satela"),
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
    addExifToWebp
};
