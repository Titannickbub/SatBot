const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const centralAccounts = require("../functions/centralAccounts");
const rpgPlayer = require("../functions/rpgPlayer");

test("a central account can claim one common initial character with only level-one moves", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-rpg-player-"));
    const previousData = centralAccounts.data;
    const previousFilePath = centralAccounts.filePath;
    const previousDirty = centralAccounts.dirty;

    try {
        await centralAccounts.init(path.join(directory, "central-accounts.json"));
        const central = await centralAccounts.getOrCreateByPlatform("discord", "rpg-player");
        const catalog = {
            fraquezas: [{ id: 0, nome: "Fogo" }],
            efeitos: [],
            golpes: [
                {
                    id: 0, nome: "Ataque inicial", frases: ["{personagem} atinge {alvo}"],
                    dano: 10, custo: { mana: 0, stamina: 0, hp: 0 },
                    tipoFraquezaId: 0, nivelDesbloqueio: 1, efeitos: []
                },
                {
                    id: 1, nome: "Ataque avançado", frases: ["{personagem} atinge {alvo}"],
                    dano: 20, custo: { mana: 0, stamina: 0, hp: 0 },
                    tipoFraquezaId: 0, nivelDesbloqueio: 2, efeitos: []
                }
            ],
            personagens: [
                {
                    id: 0, nome: "Personagem comum", sexo: "feminino", raridade: "comum",
                    media: [{ type: "photo", file: "0.png" }],
                    hp: 100, mana: 50, stamina: 50, agilidade: 10, fraquezas: [0],
                    golpesPermanentes: [0, 1], podeClonarGolpes: false,
                    limiteGolpesAprendidos: 2
                },
                {
                    id: 1, nome: "Personagem raro", sexo: "masculino", raridade: "raro",
                    media: [{ type: "photo", file: "1.png" }],
                    hp: 100, mana: 50, stamina: 50, agilidade: 10, fraquezas: [0],
                    golpesPermanentes: [0], podeClonarGolpes: false,
                    limiteGolpesAprendidos: 1
                }
            ]
        };
        const startingCharacters = rpgPlayer.getStartingCharacters(catalog);
        assert.ok(startingCharacters.length > 0);
        await assert.rejects(
            rpgPlayer.chooseInitialCharacter(centralAccounts, central.id, catalog, 1),
            /raridade comum/
        );

        const { character, profile } = await rpgPlayer.chooseInitialCharacter(
            centralAccounts,
            central.id,
            catalog,
            0
        );
        assert.equal(profile.initialCharacterId, character.id);
        assert.deepEqual(profile.characters[0], {
            characterId: character.id,
            level: 1,
            learnedMoveIds: [0]
        });

        test("owned character stats gain five percent of base per level and leave zero attributes at zero", () => {
            const character = {
                id: 8,
                hp: 101,
                mana: 0,
                stamina: 51,
                agilidade: 11
            };
            const levelTwo = rpgPlayer.getCharacterStats(character, {
                characterId: 8,
                level: 2
            });
            const levelSix = rpgPlayer.getCharacterStats(character, {
                characterId: 8,
                level: 6
            });

            assert.deepEqual(levelTwo, {
                hp: 106,
                mana: 0,
                stamina: 53,
                agilidade: 11
            });
            assert.deepEqual(levelSix, {
                hp: 126,
                mana: 0,
                stamina: 63,
                agilidade: 13
            });
            assert.deepEqual(character, {
                id: 8,
                hp: 101,
                mana: 0,
                stamina: 51,
                agilidade: 11
            });
            assert.deepEqual(rpgPlayer.getCharacterStats(character), {
                hp: 101,
                mana: 0,
                stamina: 51,
                agilidade: 11
            });
        });
        assert.equal(JSON.parse(await fs.readFile(centralAccounts.filePath, "utf8"))
            .centralAccounts[central.id].rpg.initialCharacterId, character.id);

        const progression = await rpgPlayer.addRpgXp(centralAccounts, central.id, 300);
        assert.equal(progression.level, 3);
        assert.equal(progression.levelUps, 2);
        assert.equal(progression.ascensao, 2);

        const firstAscension = await rpgPlayer.ascendCharacter(centralAccounts, central.id, 0);
        assert.equal(firstAscension.character.level, 2);
        assert.equal(firstAscension.profile.ascensao, 1);
        const secondAscension = await rpgPlayer.ascendCharacter(centralAccounts, central.id, 0);
        assert.equal(secondAscension.character.level, 3);
        assert.equal(secondAscension.profile.ascensao, 0);
        await assert.rejects(
            rpgPlayer.ascendCharacter(centralAccounts, central.id, 0),
            /pontos de Ascensão/
        );

        await assert.rejects(
            rpgPlayer.chooseInitialCharacter(centralAccounts, central.id, catalog, 0),
            /já escolheu/
        );
        assert.equal(centralAccounts.getRpgProfile(central.id).characters.length, 1);
    } finally {
        centralAccounts.data = previousData;
        centralAccounts.filePath = previousFilePath;
        centralAccounts.dirty = previousDirty;
        await fs.rm(directory, { recursive: true, force: true });
    }
});
