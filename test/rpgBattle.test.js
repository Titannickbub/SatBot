const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const battleModule = require("../functions/rpgBattle");

function makeAccounts() {
    const accounts = new Map();
    const platformIds = new Map();
    const addAccount = (centralId, platformId, name, characterId, agility, weakness, affinity) => {
        const central = {
            id: centralId,
            name,
            platformAccounts: [{
                platform: "discord",
                platformId,
                username: name.toLowerCase(),
                displayName: name
            }]
        };
        const profile = {
            xp: 0,
            ascensao: 0,
            battleRewardIds: [],
            globalCurrency: 0,
            initialCharacterId: characterId,
            teamCharacterIds: [characterId],
            characters: [{
                characterId,
                level: 1,
                learnedMoveIds: characterId === 0 ? [0, 1] : [1]
            }]
        };
        accounts.set(centralId, { central, profile });
        platformIds.set(platformId, central);
    };
    addAccount("central-a", "user-a", "Alpha", 0, 20, [], []);
    addAccount("central-b", "user-b", "Beta", 1, 10, [0, 1], []);
    addAccount("central-c", "user-c", "Gamma", 2, 5, [1], [0]);

    return {
        accounts,
        findByPlatform(platform, platformId) {
            return platform === "discord" ? platformIds.get(String(platformId)) || null : null;
        },
        getAllCentralAccounts() {
            return [...accounts.values()].map(entry => entry.central);
        },
        getCentralById(id) {
            return accounts.get(id)?.central || null;
        },
        getRpgProfile(id) {
            const profile = accounts.get(id)?.profile;
            if (!profile) throw new Error("central not found");
            return structuredClone(profile);
        },
        async updateRpgProfile(id, update) {
            const entry = accounts.get(id);
            if (!entry) throw new Error("central not found");
            entry.profile = update(structuredClone(entry.profile));
            return structuredClone(entry.profile);
        }
    };
}

function makeCatalog() {
    const moves = [
        {
            id: 0,
            nome: "Chama",
            frases: ["{personagem} atinge {alvo}"],
            dano: 10,
            custo: { mana: 2, stamina: 1, hp: 0 },
            tipoFraquezaId: 1,
            nivelDesbloqueio: 1,
            efeitos: [0]
        },
        {
            id: 1,
            nome: "Golpe neutro",
            frases: ["{personagem} atinge {alvo}"],
            dano: 1,
            custo: { mana: 0, stamina: 0, hp: 0 },
            tipoFraquezaId: null,
            nivelDesbloqueio: 1,
            efeitos: []
        }
    ];
    const makeCharacter = (id, name, agility, weaknesses, affinities) => ({
        id,
        nome: name,
        hp: 100,
        mana: 20,
        stamina: 20,
        agilidade: agility,
        fraquezas: weaknesses,
        afinidades: affinities,
        golpesPermanentes: id === 0 ? [0, 1] : [1]
    });
    return {
        fraquezas: [
            { id: 0, nome: "Gelo" },
            { id: 1, nome: "Fogo" }
        ],
        efeitos: [{
            id: 0,
            nome: "Congelado",
            afinidadeId: 0,
            danoPassivoPorRodada: 4
        }],
        golpes: moves,
        personagens: [
            makeCharacter(0, "Alpha", 20, [], []),
            makeCharacter(1, "Beta", 10, [0, 1], []),
            makeCharacter(2, "Gamma", 5, [1], [0])
        ]
    };
}

function makeMessage(userId) {
    return {
        platform: "discord",
        chatId: "channel-1",
        chatType: "group",
        isPrivate: false,
        userId,
        displayName: userId,
        raw: { guildId: "guild-1" }
    };
}

test("teams keep their selected order, apply damage and effects, and award battle XP once", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-rpg-battle-"));
    const accounts = makeAccounts();
    const catalog = makeCatalog();
    const store = battleModule.createBattleStore({
        filePath: path.join(directory, "batalhas.json"),
        scheduleTimers: false
    });
    await store.init(undefined, accounts);

    try {
        await store.setTeam("central-a", [0], catalog);
        await store.setTeam("central-b", [1], catalog);
        const challenge = store.createChallenge({
            message: makeMessage("user-a"),
            centralId: "central-a",
            centralName: "Alpha",
            opponentCentralId: "central-b",
            opponentPlatformId: "user-b",
            opponentName: "Beta",
            catalog
        });
        const battle = await store.acceptChallenge({
            challengeId: challenge.id,
            message: makeMessage("user-b"),
            centralId: "central-b",
            centralName: "Beta",
            catalog
        });

        assert.equal(battle.roundOrder[0].side, 0);
        assert.equal(battle.roundOrder[0].characterIndex, 0);
        await assert.rejects(store.attack({
            battleId: battle.id,
            centralId: "central-b",
            moveId: 1
        }), /Ainda não é o turno/);

        const attack = await store.attack({
            battleId: battle.id,
            centralId: "central-a",
            moveId: 0
        });
        assert.match(attack.events[0], /Dano: 20/);
        assert.match(attack.events[1], /afetado por Congelado/);
        assert.equal(attack.battle.players[1].team[0].hp, 80);
        assert.equal(attack.battle.players[1].team[0].effects.length, 1);

        const roundEnd = await store.attack({
            battleId: battle.id,
            centralId: "central-b",
            moveId: 1
        });
        assert.ok(roundEnd.events.some(event => /sofre 8 de dano de Congelado/.test(event)));
        assert.equal(roundEnd.battle.players[1].team[0].hp, 72);

        const completed = await store.surrender({
            battleId: battle.id,
            centralId: "central-b"
        });
        assert.equal(completed.status, "completed");
        assert.equal(accounts.accounts.get("central-a").profile.xp, 10);
        assert.equal(accounts.accounts.get("central-b").profile.xp, 1);
        await store.recoverRewards();
        assert.equal(accounts.accounts.get("central-a").profile.xp, 10);
        assert.equal(accounts.accounts.get("central-b").profile.xp, 1);
    } finally {
        store.stop();
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("battle alternates one action per player and rotates through each team's characters", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-rpg-battle-turns-"));
    const accounts = makeAccounts();
    const catalog = makeCatalog();
    accounts.accounts.get("central-a").profile.characters.push({
        characterId: 2,
        level: 1,
        learnedMoveIds: [1]
    });
    const store = battleModule.createBattleStore({
        filePath: path.join(directory, "batalhas.json"),
        scheduleTimers: false
    });
    await store.init(undefined, accounts);

    try {
        await store.setTeam("central-a", [0, 2], catalog);
        await store.setTeam("central-b", [1], catalog);
        const challenge = store.createChallenge({
            message: makeMessage("user-a"),
            centralId: "central-a",
            centralName: "Alpha",
            opponentCentralId: "central-b",
            opponentPlatformId: "user-b",
            opponentName: "Beta",
            catalog
        });
        const battle = await store.acceptChallenge({
            challengeId: challenge.id,
            message: makeMessage("user-b"),
            centralId: "central-b",
            centralName: "Beta",
            catalog
        });

        assert.deepEqual(battle.roundOrder, [
            { side: 0, characterIndex: 0 },
            { side: 1, characterIndex: 0 }
        ]);
        const firstAction = await store.attack({
            battleId: battle.id,
            centralId: "central-a",
            moveId: 1
        });
        assert.equal(store.getTurnState(firstAction.battle).actor.side, 1);

        const secondAction = await store.attack({
            battleId: battle.id,
            centralId: "central-b",
            moveId: 1
        });
        assert.equal(secondAction.battle.round, 2);
        assert.deepEqual(secondAction.battle.roundOrder, [
            { side: 0, characterIndex: 1 },
            { side: 1, characterIndex: 0 }
        ]);
        assert.equal(store.getTurnState(secondAction.battle).actor.fighter.name, "Gamma");

        const thirdAction = await store.attack({
            battleId: battle.id,
            centralId: "central-a",
            moveId: 1
        });
        assert.equal(store.getTurnState(thirdAction.battle).actor.side, 1);
        await assert.rejects(store.attack({
            battleId: battle.id,
            centralId: "central-a",
            moveId: 1
        }), /Ainda não é o turno/);
    } finally {
        store.stop();
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("active battles migrate old per-character turn orders to alternating player turns", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-rpg-battle-migration-"));
    const filePath = path.join(directory, "batalhas.json");
    const accounts = makeAccounts();
    const catalog = makeCatalog();
    accounts.accounts.get("central-a").profile.characters.push({
        characterId: 2,
        level: 1,
        learnedMoveIds: [1]
    });
    const store = battleModule.createBattleStore({ filePath, scheduleTimers: false });
    await store.init(undefined, accounts);

    try {
        await store.setTeam("central-a", [0, 2], catalog);
        await store.setTeam("central-b", [1], catalog);
        const challenge = store.createChallenge({
            message: makeMessage("user-a"),
            centralId: "central-a",
            centralName: "Alpha",
            opponentCentralId: "central-b",
            opponentPlatformId: "user-b",
            opponentName: "Beta",
            catalog
        });
        const battle = await store.acceptChallenge({
            challengeId: challenge.id,
            message: makeMessage("user-b"),
            centralId: "central-b",
            centralName: "Beta",
            catalog
        });
        const saved = JSON.parse(await fs.readFile(filePath, "utf8"));
        delete saved.battles[0].nextCharacterIndexes;
        saved.battles[0].roundOrder = [
            { side: 0, characterIndex: 0 },
            { side: 1, characterIndex: 0 },
            { side: 0, characterIndex: 1 }
        ];
        saved.battles[0].roundOrderIndex = 1;
        await fs.writeFile(filePath, JSON.stringify(saved), "utf8");

        await store.init(undefined, accounts);
        const migrated = store.getBattleForPlayer("central-a", "discord", "guild-1");
        assert.deepEqual(migrated.roundOrder, [
            { side: 1, characterIndex: 0 },
            { side: 0, characterIndex: 1 }
        ]);
        assert.equal(store.getTurnState(migrated).actor.side, 1);
        assert.equal(migrated.id, battle.id);
    } finally {
        store.stop();
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("effect affinity blocks status while still allowing immediate weakness damage", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-rpg-battle-immunity-"));
    const previousRegistry = global.platformRegistry;
    global.platformRegistry = {
        discord: { sendText: async () => "sent" }
    };
    const accounts = makeAccounts();
    const catalog = makeCatalog();
    const store = battleModule.createBattleStore({
        filePath: path.join(directory, "batalhas.json"),
        scheduleTimers: false
    });
    await store.init(undefined, accounts);

    try {
        await store.setTeam("central-a", [0], catalog);
        await store.setTeam("central-c", [2], catalog);
        const challenge = store.createChallenge({
            message: makeMessage("user-a"),
            centralId: "central-a",
            centralName: "Alpha",
            opponentCentralId: "central-c",
            opponentPlatformId: "user-c",
            opponentName: "Gamma",
            catalog
        });
        const battle = await store.acceptChallenge({
            challengeId: challenge.id,
            message: makeMessage("user-c"),
            centralId: "central-c",
            centralName: "Gamma",
            catalog
        });
        const attack = await store.attack({
            battleId: battle.id,
            centralId: "central-a",
            moveId: 0
        });
        assert.match(attack.events[0], /Dano: 20/);
        assert.match(attack.events[1], /imune ao efeito Congelado/);
        assert.equal(attack.battle.players[1].team[0].effects.length, 0);
        assert.equal(attack.battle.players[1].team[0].hp, 80);
    } finally {
        store.stop();
        global.platformRegistry = previousRegistry;
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("the 60-second turn timeout ends the match and grants the configured XP", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-rpg-battle-timeout-"));
    const previousRegistry = global.platformRegistry;
    global.platformRegistry = {
        discord: { sendText: async () => "sent" }
    };
    const accounts = makeAccounts();
    const catalog = makeCatalog();
    let timestamp = Date.now();
    const store = battleModule.createBattleStore({
        filePath: path.join(directory, "batalhas.json"),
        scheduleTimers: false,
        now: () => timestamp
    });
    await store.init(undefined, accounts);

    try {
        const challenge = store.createChallenge({
            message: makeMessage("user-a"),
            centralId: "central-a",
            centralName: "Alpha",
            opponentCentralId: "central-b",
            opponentPlatformId: "user-b",
            opponentName: "Beta",
            catalog
        });
        const battle = await store.acceptChallenge({
            challengeId: challenge.id,
            message: makeMessage("user-b"),
            centralId: "central-b",
            centralName: "Beta",
            catalog
        });
        timestamp += battleModule.TURN_TIMEOUT_MS + 1;
        const expired = await store.expireBattle(battle.id);
        assert.equal(expired.status, "completed");
        assert.equal(expired.reason, "timeout");
        assert.equal(accounts.accounts.get("central-a").profile.xp, 1);
        assert.equal(accounts.accounts.get("central-b").profile.xp, 10);
    } finally {
        store.stop();
        global.platformRegistry = previousRegistry;
        await fs.rm(directory, { recursive: true, force: true });
    }
});
