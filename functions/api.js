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

    const stream = await downloadContentFromMessage(media, mediaType);
    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    return buffer;
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
