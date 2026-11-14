const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
const MAX_ACTIONS_FILE_SIZE = 50 * 1024 * 1024;

function decodeBase64(value) {
    const text = String(value || "").replace(/^data:[^,]*;base64,/i, "").replace(/\s/g, "");
    if (!text || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
        throw new Error("Uma mídia adulta contém dados base64 inválidos.");
    }
    const buffer = Buffer.from(text, "base64");
    if (!buffer.length || buffer.length > MAX_MEDIA_SIZE) {
        throw new Error("Uma mídia adulta está vazia ou excede o limite de 50 MB.");
    }
    return buffer;
}

function storeBuffer(buffer, mediaDir) {
    if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_MEDIA_SIZE) {
        throw new Error("A mídia adulta está vazia ou excede o limite de 50 MB.");
    }
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const fileName = `act18_${hash}.bin`;
    const filePath = path.join(mediaDir, fileName);
    fs.mkdirSync(mediaDir, { recursive: true });

    if (fs.existsSync(filePath)) {
        if (!fs.readFileSync(filePath).equals(buffer)) {
            throw new Error(`O arquivo de mídia adulta ${fileName} contém dados diferentes.`);
        }
        return fileName;
    }

    const temporaryPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    try {
        fs.writeFileSync(temporaryPath, buffer, { flag: "wx" });
        fs.renameSync(temporaryPath, filePath);
    } catch (error) {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
        if (fs.existsSync(filePath) && fs.readFileSync(filePath).equals(buffer)) return fileName;
        throw error;
    }
    return fileName;
}

function writeActions(filePath, actions) {
    const serialized = `${JSON.stringify(actions, null, 2)}\n`;
    if (Buffer.byteLength(serialized, "utf8") > MAX_ACTIONS_FILE_SIZE) {
        throw new Error("O catálogo adulto excede o limite de 50 MB.");
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

function migrateActions(actions, mediaDir) {
    let changed = false;
    for (const [actionName, action] of Object.entries(actions)) {
        if (!action || typeof action !== "object" || !Array.isArray(action.media)) continue;
        for (const media of action.media) {
            if (!media || typeof media !== "object") continue;
            const legacyData = typeof media.base64 === "string" && media.base64.trim()
                ? media.base64
                : typeof media.data === "string" && media.data.trim()
                    ? media.data
                    : typeof media.url === "string" && media.url.startsWith("data:")
                        ? media.url
                        : null;
            if (legacyData === null) continue;

            try {
                const buffer = decodeBase64(legacyData);
                media.file = storeBuffer(buffer, mediaDir);
                delete media.base64;
                delete media.data;
                if (typeof media.url === "string" && media.url.startsWith("data:")) delete media.url;
                changed = true;
            } catch (error) {
                throw new Error(`Falha ao migrar mídia da ação "${actionName}": ${error.message}`);
            }
        }
    }
    return changed;
}

function migrateFile(filePath, mediaDir) {
    if (!fs.existsSync(filePath)) return false;
    const actions = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!actions || typeof actions !== "object" || Array.isArray(actions)) {
        throw new Error("O catálogo adulto precisa conter um objeto de ações.");
    }
    if (!migrateActions(actions, mediaDir)) return false;
    writeActions(filePath, actions);
    return true;
}

module.exports = {
    decodeBase64,
    storeBuffer,
    migrateActions,
    migrateFile
};
