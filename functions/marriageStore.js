const fs = require("fs");
const path = require("path");

const DEFAULT_DIR = path.join(__dirname, "..", "settings", "marriages");

function safePart(value) {
    return String(value).replace(/[\\/:*?"<>|]/g, "_");
}

function createMarriageStore(baseDir = DEFAULT_DIR) {
    function fileFor(scope) {
        return path.join(baseDir, `${safePart(scope.platform)}_${safePart(scope.id)}.json`);
    }

    function load(scope) {
        const file = fileFor(scope);
        if (!fs.existsSync(file)) {
            return { platform: scope.platform, scopeId: scope.id, pending: [], marriages: [] };
        }

        try {
            const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Formato inválido.");
            }
            return {
                platform: parsed.platform || scope.platform,
                scopeId: String(parsed.scopeId || scope.id),
                pending: Array.isArray(parsed.pending) ? parsed.pending : [],
                marriages: Array.isArray(parsed.marriages) ? parsed.marriages : []
            };
        } catch (error) {
            console.error(`[CASAMENTO] Falha ao carregar ${file}:`, error);
            throw new Error("Não foi possível carregar os dados de casamento deste grupo/servidor.");
        }
    }

    function save(scope, data) {
        fs.mkdirSync(baseDir, { recursive: true });
        const file = fileFor(scope);
        const temporaryFile = `${file}.${process.pid}.${Date.now()}.tmp`;
        try {
            fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), "utf8");
            fs.renameSync(temporaryFile, file);
        } catch (error) {
            if (fs.existsSync(temporaryFile)) fs.rmSync(temporaryFile, { force: true });
            console.error(`[CASAMENTO] Falha ao salvar ${file}:`, error);
            throw new Error("Não foi possível salvar os dados de casamento deste grupo/servidor.");
        }
    }

    return { load, save };
}

module.exports = { createMarriageStore, store: createMarriageStore() };
