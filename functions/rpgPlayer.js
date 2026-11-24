const itemRarity = require("./itemRarity");

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

module.exports = {
    getStartingCharacters,
    chooseInitialCharacter,
    getCharacterSave
};
