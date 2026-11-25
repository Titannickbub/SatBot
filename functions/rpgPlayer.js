const itemRarity = require("./itemRarity");
const { levelForXp } = require("./levelProgression");

function getStartingCharacters(catalog) {
    return catalog.personagens.filter(character => character.raridade === itemRarity.COMMON);
}

async function chooseInitialCharacter(centralAccounts, centralId, catalog, characterId) {
    const id = Number(characterId);
    if (!Number.isInteger(id) || id < 0) throw new Error("ID de personagem inválido.");
    const character = getStartingCharacters(catalog).find(entry => entry.id === id);
    if (!character) throw new Error("Personagem inicial não encontrado. Só personagens de raridade comum podem ser escolhidos.");

    const moveIds = character.podeClonarGolpes
        ? [character.golpeClonagemId]
        : character.golpesPermanentes.filter(moveId => {
            const move = catalog.golpes.find(entry => entry.id === moveId);
            return move && move.nivelDesbloqueio <= 1;
        });
    const learnedMoveIds = [...new Set(moveIds)];

    const profile = await centralAccounts.updateRpgProfile(centralId, current => {
        if (current.initialCharacterId !== null) {
            throw new Error("Você já escolheu seu personagem inicial. Essa escolha não pode ser repetida.");
        }
        if (current.characters.some(entry => entry.characterId === id)) {
            throw new Error("Você já possui esse personagem; escolha outro personagem comum para sua escolha inicial.");
        }
        current.initialCharacterId = id;
        current.characters.push({
            characterId: id,
            level: 1,
            learnedMoveIds
        });
        return current;
    });

    return { character, profile };
}

function getCharacterSave(profile, characterId) {
    return profile.characters.find(entry => entry.characterId === characterId) || null;
}

function getCharacterStats(character, characterSave = null) {
    const attributes = ["hp", "mana", "stamina", "agilidade"];
    const stats = Object.fromEntries(attributes.map(attribute => [
        attribute,
        character[attribute]
    ]));
    if (!characterSave) return stats;
    if (characterSave.characterId !== character.id ||
        !Number.isSafeInteger(characterSave.level) || characterSave.level < 1) {
        throw new Error("Save do personagem inválido.");
    }

    const growthPercent = 100 + 5 * (characterSave.level - 1);
    if (!Number.isSafeInteger(growthPercent)) {
        throw new Error("O nível do personagem ultrapassou o limite de cálculo.");
    }
    for (const attribute of attributes) {
        const baseValue = character[attribute];
        if (!Number.isFinite(baseValue) || baseValue < 0) {
            throw new Error(`O atributo ${attribute} do personagem ${character.id} é inválido.`);
        }
        const effectiveValue = Math.floor(baseValue * growthPercent / 100);
        if (!Number.isSafeInteger(effectiveValue)) {
            throw new Error(`O atributo ${attribute} do personagem ${character.id} excede o limite.`);
        }
        stats[attribute] = effectiveValue;
    }
    return stats;
}

async function addRpgXp(centralAccounts, centralId, amount) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error("A quantidade de XP deve ser um inteiro positivo.");
    }
    let previousXp = 0;
    const profile = await centralAccounts.updateRpgProfile(centralId, current => {
        previousXp = current.xp;
        const totalXp = current.xp + amount;
        if (!Number.isSafeInteger(totalXp)) {
            throw new Error("O XP total ultrapassou o limite permitido.");
        }
        current.xp = totalXp;
        return current;
    });
    const previousLevel = levelForXp(previousXp).level;
    const progress = levelForXp(profile.xp);
    return {
        amount,
        previousXp,
        xp: profile.xp,
        previousLevel,
        level: progress.level,
        levelUps: Math.max(0, progress.level - previousLevel),
        ascensao: profile.ascensao,
        profile
    };
}

async function ascendCharacter(centralAccounts, centralId, characterId) {
    const id = Number(characterId);
    if (!Number.isSafeInteger(id) || id < 0) {
        throw new Error("ID de personagem inválido.");
    }
    let character;
    const profile = await centralAccounts.updateRpgProfile(centralId, current => {
        character = getCharacterSave(current, id);
        if (!character) throw new Error("Você não possui esse personagem.");
        if (current.ascensao < 1) throw new Error("Você não tem pontos de Ascensão disponíveis.");
        if (!Number.isSafeInteger(character.level + 1)) {
            throw new Error("O nível desse personagem ultrapassou o limite permitido.");
        }
        current.ascensao -= 1;
        character.level += 1;
        return current;
    });
    return { character, profile };
}

module.exports = {
    getStartingCharacters,
    chooseInitialCharacter,
    getCharacterSave,
    getCharacterStats,
    addRpgXp,
    ascendCharacter,
    levelForXp
};
