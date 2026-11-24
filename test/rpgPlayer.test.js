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
                    id: 0, nome: "Personagem comum", raridade: "comum",
                    media: [{ type: "photo", file: "0.png" }],
                    hp: 100, mana: 50, stamina: 50, agilidade: 10, fraquezas: [0],
                    golpesPermanentes: [0, 1], podeClonarGolpes: false,
                    limiteGolpesAprendidos: 2
                },
                {
                    id: 1, nome: "Personagem raro", raridade: "raro",
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
        assert.equal(JSON.parse(await fs.readFile(centralAccounts.filePath, "utf8"))
            .centralAccounts[central.id].rpg.initialCharacterId, character.id);

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
