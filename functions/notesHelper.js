const fs = require("fs");
const path = require("path");
const economy = require("./economy");

const notesDir = path.join(__dirname, "..", "settings", "notes");

function getFilePath(message) {
    const scope = economy.getScope(message);
    if (!scope) return null;
    const safePlatform = String(scope.platform).replace(/[\\/:*?"<>|]/g, "_");
    const safeId = String(scope.id).replace(/[\\/:*?"<>|]/g, "_");
    return path.join(notesDir, `${safePlatform}_${safeId}.json`);
}

function load(message) {
    const target = getFilePath(message);
    if (!target) return null;
    if (!fs.existsSync(target)) return { notes: [] };

    const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.notes)) {
        throw new Error("O arquivo de notas possui um formato inválido.");
    }

    return {
        notes: parsed.notes.map(note => {
            if (!note || typeof note.title !== "string" || typeof note.text !== "string") {
                throw new Error("O arquivo contém uma nota inválida.");
            }
            return { title: note.title, text: note.text };
        })
    };
}

function save(message, data) {
    const target = getFilePath(message);
    if (!target) return false;
    fs.mkdirSync(notesDir, { recursive: true });
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    try {
        fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
        if (fs.existsSync(target)) fs.rmSync(target, { force: true });
        fs.renameSync(temporary, target);
        return true;
    } catch (error) {
        if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
        throw error;
    }
}

function normalizeTitle(title) {
    return String(title)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("pt-BR");
}

function add(message, title, text) {
    const data = load(message);
    if (!data) return { error: "scope" };
    if (data.notes.some(note => normalizeTitle(note.title) === normalizeTitle(title))) {
        return { error: "duplicate" };
    }
    data.notes.push({ title: title.trim(), text: text.trim() });
    if (!save(message, data)) return { error: "scope" };
    return { note: data.notes[data.notes.length - 1] };
}

function find(message, selector) {
    const data = load(message);
    if (!data) return null;
    const value = String(selector).trim();
    if (/^\d+$/.test(value)) return data.notes[Number(value) - 1] || null;
    const normalized = normalizeTitle(value);
    return data.notes.find(note => normalizeTitle(note.title) === normalized) || null;
}

function remove(message, title) {
    const data = load(message);
    if (!data) return false;
    const normalized = normalizeTitle(title);
    const index = data.notes.findIndex(note => normalizeTitle(note.title) === normalized);
    if (index === -1) return false;
    data.notes.splice(index, 1);
    return save(message, data);
}

module.exports = {
    load,
    add,
    find,
    remove
};
