const fs = require("fs");
const path = require("path");
const autorepoHelper = require("./autorepoHelper");
const act18Media = require("./act18Media");

const COMMANDS_DIR = path.join(__dirname, "..", "commands", "diversao");
const SETTINGS_DIR = path.join(__dirname, "..", "settings");

function getPaths(message, scope = "group", catalog = "normal") {
    const catalogName = catalog === "adult" ? "act18" : "act";
    if (scope === "global") {
        return {
            actionsFile: path.join(COMMANDS_DIR, `${catalogName}.json`),
            mediaDir: path.join(COMMANDS_DIR, `${catalogName}_media`)
        };
    }

    const chatKey = autorepoHelper.getChatKey(message);
    if (!chatKey) return null;

    const fileName = chatKey.replace(/\.json$/i, "");
    return {
        actionsFile: path.join(SETTINGS_DIR, catalogName, chatKey),
        mediaDir: path.join(SETTINGS_DIR, `${catalogName}_media`, fileName)
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

function readCatalogFile(paths, catalog) {
    if (!paths || !fs.existsSync(paths.actionsFile)) return {};
    if (catalog === "adult") {
        act18Media.migrateFile(paths.actionsFile, paths.mediaDir);
    }
    return readFile(paths.actionsFile);
}

function loadActionSets(message, catalog = "normal") {
    const globalPaths = getPaths(message, "global", catalog);
    const globalActions = readCatalogFile(globalPaths, catalog);
    const localPaths = getPaths(message, "group", catalog);
    const localActions = readCatalogFile(localPaths, catalog);
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
    readCatalogFile,
    loadActionSets,
    mergeActions,
    normalizeName
};
