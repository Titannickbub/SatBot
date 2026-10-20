const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "settings", "afk.json");
let cache = null;

function load() {
    if (cache) return cache;
    if (!fs.existsSync(filePath)) {
        cache = { global: {}, groups: {} };
        return cache;
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("O arquivo settings/afk.json tem um formato inválido.");
    }
    if (!parsed.global || typeof parsed.global !== "object" || Array.isArray(parsed.global)) {
        parsed.global = {};
    }
    if (!parsed.groups || typeof parsed.groups !== "object" || Array.isArray(parsed.groups)) {
        parsed.groups = {};
    }
    cache = parsed;
    return cache;
}

function save(data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
        fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), "utf8");
        fs.renameSync(temporaryPath, filePath);
        cache = data;
    } catch (error) {
        if (fs.existsSync(temporaryPath)) {
            try {
                fs.unlinkSync(temporaryPath);
            } catch (cleanupError) {
                console.error("[AFK] Falha ao limpar arquivo temporário:", cleanupError);
            }
        }
        throw error;
    }
}

function groupKey(platform, chatId, centralId) {
    return JSON.stringify([String(platform), String(chatId), String(centralId)]);
}

function copyState(state) {
    return {
        global: { ...state.global },
        groups: { ...state.groups }
    };
}

function getGlobal(centralId) {
    return load().global[String(centralId)] || null;
}

function setGlobal(centralId, record) {
    const data = copyState(load());
    data.global[String(centralId)] = record;
    save(data);
}

function removeGlobal(centralId) {
    const current = load();
    const key = String(centralId);
    if (!Object.prototype.hasOwnProperty.call(current.global, key)) return null;
    const record = current.global[key];
    const data = copyState(current);
    delete data.global[key];
    save(data);
    return record;
}

function getGroup(platform, chatId, centralId) {
    return load().groups[groupKey(platform, chatId, centralId)] || null;
}

function setGroup(platform, chatId, centralId, record) {
    const data = copyState(load());
    data.groups[groupKey(platform, chatId, centralId)] = {
        ...record,
        platform: String(platform),
        chatId: String(chatId),
        centralId: String(centralId)
    };
    save(data);
}

function removeGroup(platform, chatId, centralId) {
    const current = load();
    const key = groupKey(platform, chatId, centralId);
    if (!Object.prototype.hasOwnProperty.call(current.groups, key)) return null;
    const record = current.groups[key];
    const data = copyState(current);
    delete data.groups[key];
    save(data);
    return record;
}

module.exports = {
    getGlobal,
    setGlobal,
    removeGlobal,
    getGroup,
    setGroup,
    removeGroup
};
