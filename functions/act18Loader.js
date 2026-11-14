const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { unzipSync } = require("fflate");
const actStorage = require("./actStorage");
const act18Media = require("./act18Media");
const editor = require("../commands/diversao/act_edit");

const SETTINGS_DIR = path.join(__dirname, "..", "settings");
const DEFAULT_ZIP_PATH = path.join(SETTINGS_DIR, "MOD_ADULTO.zip");
const MAX_ARCHIVE_SIZE = 300 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_SIZE = 300 * 1024 * 1024;
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
const MAX_ENTRIES = 5000;
const DEFAULT_HASH_PATH = path.join(SETTINGS_DIR, "MOD_ADULTO.sha256");

function inspectZipDirectory(buffer) {
    let endOffset = -1;
    const minOffset = Math.max(0, buffer.length - 65557);
    for (let offset = buffer.length - 22; offset >= minOffset; offset--) {
        if (buffer.readUInt32LE(offset) !== 0x06054b50) continue;
        const commentLength = buffer.readUInt16LE(offset + 20);
        if (offset + 22 + commentLength === buffer.length) {
            endOffset = offset;
            break;
        }
    }
    if (endOffset < 0) throw new Error("O ZIP está inválido ou incompleto.");

    const diskNumber = buffer.readUInt16LE(endOffset + 4);
    const centralDisk = buffer.readUInt16LE(endOffset + 6);
    const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
    const entryCount = buffer.readUInt16LE(endOffset + 10);
    const centralSize = buffer.readUInt32LE(endOffset + 12);
    const centralOffset = buffer.readUInt32LE(endOffset + 16);
    if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount ||
        entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
        throw new Error("O ZIP multidisco ou ZIP64 não é suportado.");
    }
    if (entryCount > MAX_ENTRIES || centralOffset + centralSize > endOffset) {
        throw new Error("O ZIP contém entradas inválidas ou em excesso.");
    }

    const entries = new Map();
    let totalUncompressedSize = 0;
    let offset = centralOffset;
    const centralEnd = centralOffset + centralSize;

    for (let index = 0; index < entryCount; index++) {
        if (offset + 46 > centralEnd || buffer.readUInt32LE(offset) !== 0x02014b50) {
            throw new Error("O diretório interno do ZIP está inválido.");
        }
        const flags = buffer.readUInt16LE(offset + 8);
        const compressionMethod = buffer.readUInt16LE(offset + 10);
        const compressedSize = buffer.readUInt32LE(offset + 20);
        const uncompressedSize = buffer.readUInt32LE(offset + 24);
        const fileNameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const entryEnd = offset + 46 + fileNameLength + extraLength + commentLength;
        if (entryEnd > centralEnd || (flags & 1) ||
            ![0, 8].includes(compressionMethod) ||
            compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
            throw new Error("O ZIP contém uma entrada criptografada, ZIP64 ou não suportada.");
        }

        const fileName = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");
        validateArchivePath(fileName);
        if (entries.has(fileName)) throw new Error(`O ZIP contém uma entrada duplicada: ${fileName}`);
        if (uncompressedSize > MAX_MEDIA_SIZE && fileName !== "act18.json") {
            throw new Error(`O arquivo ${fileName} excede o limite de 50 MB.`);
        }
        if (fileName === "act18.json" && uncompressedSize > 50 * 1024 * 1024) {
            throw new Error("act18.json excede o limite de 50 MB.");
        }
        totalUncompressedSize += uncompressedSize;
        if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
            throw new Error("O conteúdo descompactado do ZIP excede 300 MB.");
        }
        entries.set(fileName, { uncompressedSize });
        offset = entryEnd;
    }

    if (offset !== centralEnd) throw new Error("O diretório do ZIP possui dados extras inválidos.");
    return entries;
}

function validateArchivePath(fileName) {
    if (!fileName || fileName.includes("\\") || fileName.includes("\0") ||
        path.posix.isAbsolute(fileName) || fileName.split("/").includes("..")) {
        throw new Error(`Caminho inválido no ZIP: ${fileName}`);
    }
    if (fileName === "act18.json" || fileName === "act18_media/") return;
    if (!fileName.startsWith("act18_media/")) {
        throw new Error(`Entrada não permitida no ZIP: ${fileName}`);
    }
    const mediaName = fileName.slice("act18_media/".length);
    if (!mediaName || mediaName.endsWith("/") || path.posix.basename(mediaName) !== mediaName) {
        throw new Error(`Arquivo de mídia inválido no ZIP: ${fileName}`);
    }
}

function readActions(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const actions = JSON.parse(fs.readFileSync(filePath, "utf8"));
    editor._internals.validateActions(actions);
    return actions;
}

function renamePackagedMedia(actions, archiveEntries, hash) {
    const mediaBuffers = new Map();
    const importedNames = new Map();
    let index = 0;

    for (const [actionName, action] of Object.entries(actions)) {
        for (const media of action.media) {
            let sourceName = null;
            let buffer = null;
            if (typeof media.base64 === "string" && media.base64.trim()) {
                buffer = act18Media.decodeBase64(media.base64);
            } else if (typeof media.data === "string" && media.data.trim()) {
                buffer = act18Media.decodeBase64(media.data);
            } else if (typeof media.url === "string" && media.url.startsWith("data:")) {
                buffer = act18Media.decodeBase64(media.url);
            } else if (typeof media.file === "string" && media.file.trim()) {
                sourceName = media.file;
                if (path.posix.basename(sourceName) !== sourceName || sourceName.includes("\\")) {
                    throw new Error(`Nome de mídia inválido na ação ${actionName}: ${sourceName}`);
                }
                buffer = archiveEntries.get(sourceName);
                if (!buffer) throw new Error(`A mídia "${sourceName}" da ação "${actionName}" não está no ZIP.`);
            }

            if (!buffer) continue;
            const importKey = sourceName || `${actionName}:${index}`;
            let targetName = importedNames.get(importKey);
            if (!targetName) {
                targetName = `mod_${hash.slice(0, 16)}_${index}.bin`;
                importedNames.set(importKey, targetName);
                mediaBuffers.set(targetName, buffer);
                index++;
            }
            media.file = targetName;
            delete media.base64;
            delete media.data;
            delete media.url;
        }
    }
    return mediaBuffers;
}

function mergeActions(existingActions, importedActions) {
    const merged = { ...existingActions };
    for (const [name, action] of Object.entries(importedActions)) {
        const normalizedName = actStorage.normalizeName(name);
        const existingName = Object.keys(merged).find(
            candidate => actStorage.normalizeName(candidate) === normalizedName
        );
        if (existingName) delete merged[existingName];
        merged[name] = action;
    }
    editor._internals.validateActions(merged);
    return merged;
}

function writeBufferAtomically(filePath, buffer) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (fs.existsSync(filePath)) {
        const existing = fs.readFileSync(filePath);
        if (existing.equals(buffer)) return;
        throw new Error(`O arquivo de mídia de destino já existe com outro conteúdo: ${path.basename(filePath)}`);
    }
    const temporaryPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    try {
        fs.writeFileSync(temporaryPath, buffer, { flag: "wx" });
        fs.renameSync(temporaryPath, filePath);
    } catch (error) {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
        throw error;
    }
}

function writeActionsAtomically(filePath, actions) {
    const serialized = `${JSON.stringify(actions, null, 2)}\n`;
    if (Buffer.byteLength(serialized, "utf8") > 50 * 1024 * 1024) {
        throw new Error("O catálogo global excede o limite de 50 MB.");
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    let descriptor;
    try {
        descriptor = fs.openSync(temporaryPath, "wx");
        fs.writeFileSync(descriptor, serialized, "utf8");
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = null;
        fs.renameSync(temporaryPath, filePath);
    } catch (error) {
        if (descriptor !== undefined && descriptor !== null) fs.closeSync(descriptor);
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
        throw error;
    }
}

function importArchive(buffer, options = {}) {
    const { importedActions, archiveMedia } = readArchive(buffer);
    const archiveHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const mediaBuffers = renamePackagedMedia(importedActions, archiveMedia, archiveHash);
    const paths = options.paths || actStorage.getPaths(null, "global", "adult");
    const currentActions = readActions(paths.actionsFile);
    const mergedActions = mergeActions(currentActions, importedActions);

    for (const [fileName, mediaBuffer] of mediaBuffers) {
        writeBufferAtomically(path.join(paths.mediaDir, fileName), mediaBuffer);
    }
    writeActionsAtomically(paths.actionsFile, mergedActions);

    return {
        importedActions: Object.keys(importedActions).length,
        globalActions: Object.keys(mergedActions).length,
        importedMedia: mediaBuffers.size
    };
}

function readArchive(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_ARCHIVE_SIZE) {
        throw new Error("O ZIP está vazio ou excede o limite de 300 MB.");
    }
    const directoryEntries = inspectZipDirectory(buffer);
    const extracted = unzipSync(buffer);
    for (const [fileName, metadata] of directoryEntries) {
        const content = extracted[fileName];
        if (!content || content.length !== metadata.uncompressedSize) {
            throw new Error(`Não foi possível ler a entrada ${fileName} do ZIP.`);
        }
    }

    const jsonFile = extracted["act18.json"];
    if (!jsonFile) throw new Error("O ZIP precisa conter act18.json na raiz.");
    const importedActions = JSON.parse(Buffer.from(jsonFile).toString("utf8"));
    editor._internals.validateActions(importedActions);

    const archiveMedia = new Map();
    for (const [fileName, content] of Object.entries(extracted)) {
        if (fileName.startsWith("act18_media/") && !fileName.endsWith("/")) {
            archiveMedia.set(fileName.slice("act18_media/".length), Buffer.from(content));
        }
    }

    for (const [actionName, action] of Object.entries(importedActions)) {
        for (const media of action.media) {
            if (media.base64 || media.data || (typeof media.url === "string" && media.url.startsWith("data:"))) continue;
            if (typeof media.file === "string") {
                if (!archiveMedia.has(media.file) || path.posix.basename(media.file) !== media.file) {
                    throw new Error(`A mídia "${media.file}" da ação "${actionName}" não está no ZIP.`);
                }
                continue;
            }
            throw new Error(`A ação "${actionName}" tem uma mídia sem arquivo local no pacote.`);
        }
    }
    return { importedActions, archiveMedia };
}

function loadFromZip(options = {}) {
    const zipPath = options.zipPath || DEFAULT_ZIP_PATH;
    if (!fs.existsSync(zipPath)) return { status: "missing", zipPath };
    const archiveSize = fs.statSync(zipPath).size;
    if (archiveSize === 0 || archiveSize > MAX_ARCHIVE_SIZE) {
        throw new Error("MOD_ADULTO.zip está vazio ou excede o limite de 300 MB.");
    }
    const zipBuffer = fs.readFileSync(zipPath);
    const hash = crypto.createHash("sha256").update(zipBuffer).digest("hex");
    const hashPath = options.hashPath || DEFAULT_HASH_PATH;
    const paths = options.paths || actStorage.getPaths(null, "global", "adult");
    if (fs.existsSync(paths.actionsFile) && fs.existsSync(hashPath) &&
        fs.readFileSync(hashPath, "utf8").trim() === hash) {
        return { status: "unchanged", zipPath };
    }
    const result = importArchive(zipBuffer, { ...options, paths });
    fs.mkdirSync(path.dirname(hashPath), { recursive: true });
    const temporaryHashPath = `${hashPath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    try {
        fs.writeFileSync(temporaryHashPath, `${hash}\n`, { flag: "wx" });
        fs.renameSync(temporaryHashPath, hashPath);
    } catch (error) {
        if (fs.existsSync(temporaryHashPath)) fs.unlinkSync(temporaryHashPath);
        throw error;
    }
    return { status: "loaded", zipPath, ...result };
}

function migrateGlobalCatalog(options = {}) {
    const paths = options.paths || actStorage.getPaths(null, "global", "adult");
    return act18Media.migrateFile(paths.actionsFile, paths.mediaDir);
}

module.exports = {
    loadFromZip,
    migrateGlobalCatalog,
    importArchive,
    readArchive,
    inspectZipDirectory
};
