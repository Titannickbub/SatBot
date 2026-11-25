const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const itemRarity = require("./itemRarity");

const RPG_DIR = path.join(__dirname, "..", "settings", "rpg");
const CATALOG_PATH = path.join(RPG_DIR, "personagens.json");
const MEDIA_DIR = path.join(RPG_DIR, "personagens_media");
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const LEGACY_CHARACTER_BASE = "Sem base";
const LEGACY_CHARACTER_SEX = "desconhecido";
const RARITY_LABELS = Object.freeze({
    [itemRarity.COMMON]: "Comum",
    [itemRarity.UNCOMMON]: "Incomum",
    [itemRarity.RARE]: "Raro",
    [itemRarity.EPIC]: "Épico",
    [itemRarity.LEGENDARY]: "Lendário"
});
const CHARACTER_RARITIES = Object.freeze(Object.keys(RARITY_LABELS));
const SEX_LABELS = Object.freeze({
    feminino: "Feminino",
    masculino: "Masculino",
    intersexo: "Intersexo",
    nao_binario: "Não binário",
    agenero: "Agênero",
    desconhecido: "Desconhecido"
});
const CHARACTER_SEXES = Object.freeze(Object.keys(SEX_LABELS));
const IMAGE_FORMATS = [
    { ext: "png", mimeType: "image/png", signature: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
    { ext: "jpg", mimeType: "image/jpeg", signature: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
    { ext: "gif", mimeType: "image/gif", signature: buffer => buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii")) },
    { ext: "webp", mimeType: "image/webp", signature: buffer => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" }
];

function emptyCatalog() {
    return { fraquezas: [], efeitos: [], golpes: [], personagens: [] };
}

function ensureDirectories() {
    fs.mkdirSync(RPG_DIR, { recursive: true });
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

function readCatalog() {
    ensureDirectories();
    if (!fs.existsSync(CATALOG_PATH)) return emptyCatalog();
    let catalog;
    try {
        catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
    } catch (error) {
        throw new Error(`O catálogo RPG contém JSON inválido: ${error.message}`);
    }
    let migrated = false;
    for (const character of Array.isArray(catalog?.personagens) ? catalog.personagens : []) {
        if (character && character.raridade === undefined) {
            character.raridade = itemRarity.UNCOMMON;
            migrated = true;
        }
        if (character && (character.base === undefined || character.base === null ||
            (typeof character.base === "string" && !character.base.trim()))) {
            character.base = LEGACY_CHARACTER_BASE;
            migrated = true;
        }
        if (character && (character.sexo === undefined || character.sexo === null ||
            (typeof character.sexo === "string" && !character.sexo.trim()))) {
            character.sexo = LEGACY_CHARACTER_SEX;
            migrated = true;
        }
    }
    validateCatalog(catalog);
    if (migrated) writeCatalog(catalog);
    return catalog;
}

function writeCatalog(catalog) {
    validateCatalog(catalog);
    ensureDirectories();
    const temporaryPath = `${CATALOG_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, CATALOG_PATH);
    return catalog;
}

function validateCatalog(catalog) {
    if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
        throw new Error("O catálogo RPG precisa ser um objeto.");
    }
    for (const key of ["fraquezas", "efeitos", "golpes", "personagens"]) {
        if (!Array.isArray(catalog[key])) throw new Error(`A lista "${key}" precisa existir no catálogo.`);
    }
    validateDefinitions(catalog.fraquezas, "fraqueza");
    validateDefinitions(catalog.efeitos, "efeito");
    validateDefinitions(catalog.golpes, "golpe");
    validateDefinitions(catalog.personagens, "personagem");

    const weaknessIds = new Set(catalog.fraquezas.map(item => item.id));
    const effectIds = new Set(catalog.efeitos.map(item => item.id));
    const moveIds = new Set(catalog.golpes.map(item => item.id));

    for (const move of catalog.golpes) {
        requireText(move.nome, `Nome do golpe ${move.id}`);
        if (!Array.isArray(move.frases) || !move.frases.length ||
            move.frases.some(phrase => typeof phrase !== "string" || !phrase.trim())) {
            throw new Error(`O golpe ${move.id} precisa ter ao menos uma frase.`);
        }
        requireNonNegativeNumber(move.dano, `Dano do golpe ${move.id}`);
        if (!move.custo || typeof move.custo !== "object") {
            throw new Error(`O golpe ${move.id} precisa definir custos de mana, stamina e HP.`);
        }
        for (const resource of ["mana", "stamina", "hp"]) {
            requireNonNegativeNumber(move.custo[resource], `Custo de ${resource} do golpe ${move.id}`);
        }
        if (move.tipoFraquezaId !== null && !weaknessIds.has(move.tipoFraquezaId)) {
            throw new Error(`O golpe ${move.id} referencia uma fraqueza inexistente.`);
        }
        requireNonNegativeInteger(move.nivelDesbloqueio, `Nível de desbloqueio do golpe ${move.id}`);
        if (!Array.isArray(move.efeitos) || move.efeitos.some(id => !effectIds.has(id))) {
            throw new Error(`O golpe ${move.id} referencia efeitos inválidos.`);
        }
    }

    for (const character of catalog.personagens) {
        requireText(character.nome, `Nome do personagem ${character.id}`);
        requireText(character.base, `Base do personagem ${character.id}`);
        if (character.base.trim().length > 80) {
            throw new Error(`A base do personagem ${character.id} deve ter até 80 caracteres.`);
        }
        if (!CHARACTER_SEXES.includes(character.sexo)) {
            throw new Error(`O personagem ${character.id} precisa ter um sexo válido.`);
        }
        if (!CHARACTER_RARITIES.includes(character.raridade)) {
            throw new Error(`O personagem ${character.id} precisa ter uma raridade válida.`);
        }
        if (typeof character.podeClonarGolpes !== "boolean") {
            throw new Error(`O personagem ${character.id} precisa definir podeClonarGolpes.`);
        }
        requirePositiveNumber(character.hp, `HP do personagem ${character.id}`);
        for (const resource of ["mana", "stamina", "agilidade"]) {
            requireNonNegativeNumber(character[resource], `${resource} do personagem ${character.id}`);
        }
        if (!Array.isArray(character.fraquezas) || !character.fraquezas.length ||
            character.fraquezas.some(id => !weaknessIds.has(id))) {
            throw new Error(`O personagem ${character.id} referencia fraquezas inválidas.`);
        }
        if (character.afinidades !== undefined &&
            (!Array.isArray(character.afinidades) || character.afinidades.some(id => !weaknessIds.has(id)))) {
            throw new Error(`O personagem ${character.id} referencia afinidades inválidas.`);
        }
        validateCharacterImageReference(character.media, character.id);
        const cloneEnabled = character.podeClonarGolpes === true;
        if (cloneEnabled) {
            const cloneMove = catalog.golpes.find(move => move.id === character.golpeClonagemId);
            if (!cloneMove || cloneMove.nome !== "Clone Travado" || cloneMove.podeEsquecer !== false) {
                throw new Error(`O personagem clonador ${character.id} precisa referenciar o golpe de clonagem.`);
            }
        } else if (!Array.isArray(character.golpesPermanentes)) {
            throw new Error(`O personagem ${character.id} precisa definir golpesPermanentes.`);
        }
        if (Array.isArray(character.golpesPermanentes) &&
            character.golpesPermanentes.some(id => !moveIds.has(id))) {
            throw new Error(`O personagem ${character.id} referencia golpes permanentes inexistentes.`);
        }
        if (!Number.isInteger(character.limiteGolpesAprendidos) &&
            character.limiteGolpesAprendidos !== null) {
            throw new Error(`O limite de golpes do personagem ${character.id} precisa ser um inteiro ou null.`);
        }
        if (character.limiteGolpesAprendidos !== null && character.limiteGolpesAprendidos < 0) {
            throw new Error(`O limite de golpes do personagem ${character.id} não pode ser negativo.`);
        }
    }
}

function validateDefinitions(entries, label) {
    const ids = new Set();
    const maxNameLength = label === "fraqueza" || label === "efeito" ? 40
        : label === "golpe" ? 60 : 80;
    for (const entry of entries) {
        if (!entry || typeof entry !== "object" || !Number.isInteger(entry.id) || entry.id < 0) {
            throw new Error(`Cada ${label} precisa ter um ID inteiro não negativo.`);
        }
        if (ids.has(entry.id)) throw new Error(`ID duplicado na lista de ${label}s: ${entry.id}.`);
        requireText(entry.nome, `Nome do ${label} ${entry.id}`);
        if (entry.nome.length > maxNameLength) {
            throw new Error(`O nome do ${label} ${entry.id} deve ter até ${maxNameLength} caracteres.`);
        }
        ids.add(entry.id);
    }
}

function validateCharacterImageReference(media, characterId) {
    if (!Array.isArray(media) || media.length !== 1) {
        throw new Error(`O personagem ${characterId} precisa ter exatamente uma imagem.`);
    }
    const image = media[0];
    if (image?.type !== "photo" || typeof image.file !== "string" ||
        !image.file || path.basename(image.file) !== image.file) {
        throw new Error(`A referência de imagem do personagem ${characterId} é inválida.`);
    }
}

function nextId(entries) {
    return entries.reduce((max, entry) => Math.max(max, entry.id), -1) + 1;
}

function requireText(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} é obrigatório.`);
}

function requireNonNegativeNumber(value, label) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${label} precisa ser um número não negativo.`);
}

function requirePositiveNumber(value, label) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} precisa ser maior que zero.`);
}

function requireNonNegativeInteger(value, label) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${label} precisa ser um inteiro não negativo.`);
}

function createAttribute(catalog, name) {
    requireText(name, "Nome do atributo");
    if (name.length > 40) throw new Error("O nome do atributo deve ter até 40 caracteres.");
    if (catalog.fraquezas.some(item => item.nome.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) {
        throw new Error("Já existe um atributo com esse nome.");
    }
    const attribute = { id: nextId(catalog.fraquezas), nome: name.trim() };
    catalog.fraquezas.push(attribute);
    return attribute;
}

function updateDefinitionName(entries, id, name, label) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId < 0) throw new Error(`ID do ${label} inválido.`);
    requireText(name, `Nome do ${label}`);
    const trimmedName = name.trim();
    if (trimmedName.length > 40) throw new Error(`O nome do ${label} deve ter até 40 caracteres.`);
    const definition = entries.find(item => item.id === numericId);
    if (!definition) throw new Error(`${label[0].toUpperCase()}${label.slice(1)} não encontrado.`);
    if (entries.some(item =>
        item.id !== numericId && item.nome.toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
    )) {
        throw new Error(`Já existe um ${label} com esse nome.`);
    }
    definition.nome = trimmedName;
    return definition;
}

function updateAttribute(catalog, id, name) {
    return updateDefinitionName(catalog.fraquezas, id, name, "atributo");
}

function createEffect(catalog, name) {
    requireText(name, "Nome do efeito");
    if (name.length > 40) throw new Error("O nome do efeito deve ter até 40 caracteres.");
    if (catalog.efeitos.some(item => item.nome.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) {
        throw new Error("Já existe um efeito com esse nome.");
    }
    const effect = { id: nextId(catalog.efeitos), nome: name.trim() };
    catalog.efeitos.push(effect);
    return effect;
}

function updateEffect(catalog, id, name) {
    return updateDefinitionName(catalog.efeitos, id, name, "efeito");
}

function buildMove(id, input) {
    const name = String(input.nome || "").trim();
    if (name.toLocaleLowerCase() === "clone travado") {
        throw new Error("O nome Clone Travado é reservado para o golpe fixo dos personagens clonadores.");
    }
    return {
        id,
        nome: name,
        frases: Array.isArray(input.frases) ? input.frases.map(String).map(item => item.trim()).filter(Boolean) : [],
        dano: Number(input.dano),
        custo: {
            mana: Number(input.custo?.mana),
            stamina: Number(input.custo?.stamina),
            hp: Number(input.custo?.hp)
        },
        tipoFraquezaId: input.tipoFraquezaId === null ? null : Number(input.tipoFraquezaId),
        nivelDesbloqueio: Number(input.nivelDesbloqueio),
        efeitos: Array.isArray(input.efeitos) ? [...new Set(input.efeitos.map(Number))] : []
    };
}

function createMove(catalog, input) {
    const move = buildMove(nextId(catalog.golpes), input);
    catalog.golpes.push(move);
    try {
        validateCatalog(catalog);
    } catch (error) {
        catalog.golpes.pop();
        throw error;
    }
    return move;
}

function updateMove(catalog, id, input) {
    const numericId = Number(id);
    const index = catalog.golpes.findIndex(move => move.id === numericId);
    if (!Number.isInteger(numericId) || numericId < 0 || index < 0) {
        throw new Error("Golpe não encontrado.");
    }
    if (catalog.golpes[index].podeEsquecer === false ||
        catalog.golpes[index].nome === "Clone Travado") {
        throw new Error("O golpe Clone Travado é fixo e não pode ser editado.");
    }
    const original = catalog.golpes[index];
    catalog.golpes[index] = buildMove(numericId, input);
    try {
        validateCatalog(catalog);
    } catch (error) {
        catalog.golpes[index] = original;
        throw error;
    }
    return catalog.golpes[index];
}

function ensureCloneMove(catalog) {
    const existing = catalog.golpes.find(move => move.nome === "Clone Travado");
    if (existing) {
        if (existing.podeEsquecer !== false || existing.dano !== 0 ||
            existing.custo?.mana !== 0 || existing.custo?.stamina !== 0 || existing.custo?.hp !== 0) {
            throw new Error("O golpe Clone Travado existente não corresponde à definição fixa reservada.");
        }
        return existing;
    }
    const move = {
        id: nextId(catalog.golpes),
        nome: "Clone Travado",
        frases: ["{personagem} ativou Clone Travado contra {alvo}!"],
        dano: 0,
        custo: { mana: 0, stamina: 0, hp: 0 },
        tipoFraquezaId: null,
        nivelDesbloqueio: 1,
        efeitos: [],
        podeEsquecer: false
    };
    catalog.golpes.push(move);
    return move;
}

function detectImageFormat(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error("A imagem anexada está vazia.");
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error("A imagem deve ter até 8 MB.");
    const format = IMAGE_FORMATS.find(candidate => candidate.signature(buffer));
    if (!format) throw new Error("Formato de imagem inválido. Use PNG, JPEG, GIF ou WebP.");
    return format;
}

function storeCharacterImage(characterId, buffer) {
    ensureDirectories();
    const format = detectImageFormat(buffer);
    const file = `${characterId}.${format.ext}`;
    writeCharacterImageFile(file, buffer);
    return { type: "photo", file };
}

function writeCharacterImageFile(file, buffer) {
    if (typeof file !== "string" || path.basename(file) !== file) {
        throw new Error("O nome do arquivo de imagem é inválido.");
    }
    ensureDirectories();
    fs.writeFileSync(path.join(MEDIA_DIR, file), buffer);
}

function buildCharacter(catalog, id, input, media) {
    const character = {
        id,
        nome: String(input.nome || "").trim(),
        base: String(input.base || "").trim(),
        sexo: String(input.sexo || "").trim().toLocaleLowerCase(),
        raridade: String(input.raridade || ""),
        media,
        hp: Number(input.hp),
        mana: Number(input.mana),
        stamina: Number(input.stamina),
        fraquezas: [...new Set((input.fraquezas || []).map(Number))],
        agilidade: Number(input.agilidade),
        podeClonarGolpes: input.podeClonarGolpes === true,
        limiteGolpesAprendidos: input.limiteGolpesAprendidos === null
            ? null
            : Number(input.limiteGolpesAprendidos)
    };
    if (character.nome.length > 80) throw new Error("O nome do personagem deve ter até 80 caracteres.");
    requireText(character.base, "Base do personagem");
    if (character.base.length > 80) throw new Error("A base do personagem deve ter até 80 caracteres.");
    if (!CHARACTER_SEXES.includes(character.sexo)) {
        throw new Error(`Selecione uma opção válida para o sexo do personagem (${CHARACTER_SEXES.join(", ")}).`);
    }
    if (!CHARACTER_RARITIES.includes(character.raridade)) {
        throw new Error("Selecione uma raridade válida para o personagem.");
    }
    if (input.afinidades?.length) character.afinidades = [...new Set(input.afinidades.map(Number))];
    if (character.podeClonarGolpes) {
        character.golpeClonagemId = ensureCloneMove(catalog).id;
    } else {
        character.golpesPermanentes = [...new Set((input.golpesPermanentes || []).map(Number))];
    }
    return character;
}

function saveCharacter(catalog, input, imageBuffer) {
    const id = nextId(catalog.personagens);
    const previousMoveCount = catalog.golpes.length;
    let imagePath;
    try {
        const character = buildCharacter(catalog, id, input, [{ type: "photo", file: `${id}.png` }]);
        catalog.personagens.push(character);
        validateCatalog(catalog);
        const format = detectImageFormat(imageBuffer);
        const image = { type: "photo", file: `${id}.${format.ext}` };
        character.media = [image];
        validateCatalog(catalog);
        imagePath = path.join(MEDIA_DIR, image.file);
        storeCharacterImage(id, imageBuffer);
        writeCatalog(catalog);
        return character;
    } catch (error) {
        if (catalog.personagens.at(-1)?.id === id) catalog.personagens.pop();
        catalog.golpes.length = previousMoveCount;
        if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        throw error;
    }
}

function updateCharacter(catalog, id, input, imageBuffer = null) {
    const numericId = Number(id);
    const index = catalog.personagens.findIndex(character => character.id === numericId);
    if (!Number.isInteger(numericId) || numericId < 0 || index < 0) {
        throw new Error("Personagem não encontrado.");
    }

    const original = catalog.personagens[index];
    const previousMoveCount = catalog.golpes.length;
    let newImagePath = null;
    let candidate;
    try {
        candidate = buildCharacter(catalog, numericId, input, original.media);
        if (imageBuffer) {
            const format = detectImageFormat(imageBuffer);
            const file = `${numericId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${format.ext}`;
            candidate.media = [{ type: "photo", file }];
        }
        catalog.personagens[index] = candidate;
        validateCatalog(catalog);
        if (imageBuffer) {
            newImagePath = path.join(MEDIA_DIR, candidate.media[0].file);
            writeCharacterImageFile(candidate.media[0].file, imageBuffer);
        }
        writeCatalog(catalog);
    } catch (error) {
        catalog.personagens[index] = original;
        catalog.golpes.length = previousMoveCount;
        if (newImagePath && fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
        throw error;
    }

    const oldImage = original.media[0].file;
    if (oldImage !== candidate.media[0].file &&
        !catalog.personagens.some(character =>
            character.id !== numericId && character.media.some(image => image.file === oldImage)
        )) {
        const oldImagePath = path.join(MEDIA_DIR, oldImage);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
    }
    return candidate;
}

function persist(catalog) {
    writeCatalog(catalog);
}

module.exports = {
    RPG_DIR,
    CATALOG_PATH,
    MEDIA_DIR,
    MAX_IMAGE_BYTES,
    LEGACY_CHARACTER_BASE,
    LEGACY_CHARACTER_SEX,
    RARITY_LABELS,
    CHARACTER_RARITIES,
    SEX_LABELS,
    CHARACTER_SEXES,
    emptyCatalog,
    readCatalog,
    writeCatalog,
    validateCatalog,
    createAttribute,
    updateAttribute,
    createEffect,
    updateEffect,
    createMove,
    updateMove,
    ensureCloneMove,
    detectImageFormat,
    storeCharacterImage,
    saveCharacter,
    updateCharacter,
    persist,
    nextId
};
