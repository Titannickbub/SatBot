const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRemoteUrl(value) {
    return (
        typeof value === "string" &&
        /^(https?:)?\/\//i.test(value)
    );
}

function resolveLocalPath(filePath) {
    if (typeof filePath !== "string") {
        throw new TypeError("Path must be a string.");
    }

    return path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);
}

function ensureFileExists(filePath) {
    const resolvedPath = resolveLocalPath(filePath);

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Arquivo não encontrado: ${resolvedPath}`);
    }

    return resolvedPath;
}

async function readLocalFile(filePath) {
    const resolvedPath = ensureFileExists(filePath);
    return fs.readFileSync(resolvedPath);
}

async function fetchJson(url, config = {}) {
    const response = await axios.get(url, {
        ...config,
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
            ...(config.headers || {})
        }
    });

    return response.data;
}

async function fetchText(url, config = {}) {
    const response = await axios.get(url, {
        ...config,
        responseType: "text",
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/plain, text/html, */*",
            ...(config.headers || {})
        }
    });

    return response.data;
}

async function postJson(url, data, config = {}) {
    const response = await axios.post(url, data, {
        ...config,
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/json",
            ...(config.headers || {})
        }
    });

    return response.data;
}

async function postForm(url, formData, config = {}) {
    const response = await axios.post(url, formData, {
        ...config,
        headers: {
            ...(formData.getHeaders ? formData.getHeaders() : {}),
            "User-Agent": "Mozilla/5.0",
            ...(config.headers || {})
        }
    });

    return response.data;
}

async function fetchBuffer(url, config = {}) {
    const response = await axios.get(url, {
        ...config,
        responseType: "arraybuffer",
        headers: {
            "User-Agent": "Mozilla/5.0",
            ...(config.headers || {})
        }
    });

    return Buffer.from(response.data);
}

async function getFileBuffer(media, mediaType) {
    if (!downloadContentFromMessage) {
        throw new Error("downloadContentFromMessage não encontrado em @whiskeysockets/baileys.");
    }

    const sanitizedMedia = media ? { ...media } : media;
    if (sanitizedMedia && typeof sanitizedMedia === "object") {
        if (sanitizedMedia.url && sanitizedMedia.url.includes("a.whatsapp.net")) {
            sanitizedMedia.url = sanitizedMedia.url.replace("a.whatsapp.net", "mmg.whatsapp.net");
        }
    }

    try {
        const stream = await downloadContentFromMessage(sanitizedMedia, mediaType, { host: "mmg.whatsapp.net" });
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (buffer && buffer.length > 0) {
            return buffer;
        }
    } catch (err) {
        console.warn(`[API] downloadContentFromMessage falhou (${err.message || err}). Tentando fallback via axios...`);
    }

    // Fallback: baixar via axios (usa o módulo https nativo do Node, evitando erros de fetch/IPv6 do undici)
    try {
        const { getMediaKeys } = require("@whiskeysockets/baileys");
        const crypto = require("crypto");

        const targetMedia = sanitizedMedia || media || {};
        const mediaKey = targetMedia.mediaKey || targetMedia.mediaKeyBuffer;
        if (!mediaKey) {
            throw new Error("mediaKey ausente no objeto de mídia.");
        }

        let host = "mmg.whatsapp.net";
        if (targetMedia.url) {
            try {
                const parsedHost = new URL(targetMedia.url).host;
                if (parsedHost && !parsedHost.startsWith("a.whatsapp") && parsedHost.includes("whatsapp.net")) {
                    host = parsedHost;
                }
            } catch (_) {}
        }

        let downloadUrl = targetMedia.url;
        if (targetMedia.directPath) {
            downloadUrl = `https://${host}${targetMedia.directPath}`;
        } else if (downloadUrl && downloadUrl.includes("a.whatsapp.net")) {
            downloadUrl = downloadUrl.replace("a.whatsapp.net", "mmg.whatsapp.net");
        }

        if (!downloadUrl) {
            throw new Error("URL de download ausente no objeto de mídia.");
        }

        let response;
        try {
            response = await axios.get(downloadUrl, {
                responseType: "stream",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Origin": "https://web.whatsapp.com"
                }
            });
        } catch (netErr) {
            if (targetMedia.directPath && host !== "mms.whatsapp.net") {
                const altUrl = `https://mms.whatsapp.net${targetMedia.directPath}`;
                response = await axios.get(altUrl, {
                    responseType: "stream",
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                        "Origin": "https://web.whatsapp.com"
                    }
                });
            } else {
                throw netErr;
            }
        }

        const keys = await getMediaKeys(mediaKey, mediaType);
        const decipher = crypto.createDecipheriv("aes-256-cbc", keys.cipherKey, keys.iv);

        const chunks = [];
        for await (const chunk of response.data.pipe(decipher)) {
            chunks.push(chunk);
        }

        const decryptedBuffer = Buffer.concat(chunks);
        const fileLength = Number(targetMedia.fileLength || targetMedia.fileLength?.low || 0);
        if (fileLength > 0 && decryptedBuffer.length >= fileLength) {
            return decryptedBuffer.slice(0, fileLength);
        }

        return decryptedBuffer;
    } catch (fallbackErr) {
        console.error("[API] Fallback de download de mídia via axios falhou:", fallbackErr.message || fallbackErr);
        throw fallbackErr;
    }
}

function createFormData(fields = {}, files = []) {
    const form = new FormData();

    Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            form.append(key, value);
        }
    });

    files.forEach(file => {
        const { name, value, filename, contentType } = file;
        if (!name || value === undefined) {
            return;
        }

        if (typeof value === "string" && !isRemoteUrl(value) && fs.existsSync(resolveLocalPath(value))) {
            form.append(name, fs.createReadStream(resolveLocalPath(value)), {
                filename: filename || path.basename(value),
                contentType
            });
        } else {
            form.append(name, value, {
                filename,
                contentType
            });
        }
    });

    return form;
}

module.exports = {
    sleep,
    isRemoteUrl,
    resolveLocalPath,
    ensureFileExists,
    readLocalFile,
    fetchJson,
    fetchText,
    fetchBuffer,
    postJson,
    postForm,
    createFormData,
    getFileBuffer
};
