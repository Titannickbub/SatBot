const fs = require("fs");
const path = require("path");
const autorepoHelper = require("./autorepoHelper");

const COMMANDS_DIR = path.join(__dirname, "..", "commands", "diversao");
const SETTINGS_DIR = path.join(__dirname, "..", "settings");

function getPaths(message, scope = "group") {
    if (scope === "global") {
        return {
            actionsFile: path.join(COMMANDS_DIR, "act.json"),
            mediaDir: path.join(COMMANDS_DIR, "act_media")
        };
    }

    const chatKey = autorepoHelper.getChatKey(message);
    if (!chatKey) return null;

    const fileName = chatKey.replace(/\.json$/i, "");
    return {
        actionsFile: path.join(SETTINGS_DIR, "act", chatKey),
        mediaDir: path.join(SETTINGS_DIR, "act_media", fileName)
    };
}

function readFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("O arquivo precisa conter um objeto de ações.");
    }
    return parsed;
}

function loadActionSets(message) {
    const globalPaths = getPaths(message, "global");
    const globalActions = readFile(globalPaths.actionsFile);
    const localPaths = getPaths(message, "group");
    const localActions = localPaths ? readFile(localPaths.actionsFile) : {};
    return { globalActions, localActions };
}

function mergeActions(globalActions, localActions) {
    const merged = { ...globalActions };
    for (const [localName, localAction] of Object.entries(localActions)) {
        const normalizedName = normalizeName(localName);
        const globalName = Object.keys(merged).find(name => normalizeName(name) === normalizedName);
        if (globalName) delete merged[globalName];
        merged[localName] = localAction;
    }
    return merged;
}

function normalizeName(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

module.exports = {
    getPaths,
    loadActionSets,
    mergeActions,
    normalizeName
};
