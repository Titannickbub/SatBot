const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const centralAccounts = require("../functions/centralAccounts");

test("linking and unlinking platforms retains the central account identity and login", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-central-accounts-"));
    const previousData = centralAccounts.data;
    const previousFilePath = centralAccounts.filePath;
    const previousDirty = centralAccounts.dirty;

    try {
        await centralAccounts.init(path.join(directory, "central-accounts.json"));
        const target = await centralAccounts.getOrCreateByPlatform("discord", "target-user", {
            username: "target-login",
            displayName: "Receiving account"
        });
        const source = await centralAccounts.getOrCreateByPlatform("telegram", "source-user", {
            username: "source-login"
        });
        target.webAuth = {
            username: "central-login",
            passwordSalt: "target-salt",
            passwordHash: "target-password-hash",
            rememberedSessions: [{ tokenHash: "target-session" }]
        };
        target.name = "Receiving account";
        target.rpg = {
            xp: 20,
            globalCurrency: 30,
            initialCharacterId: 0,
            characters: [{ characterId: 0, level: 3, learnedMoveIds: [1, 2] }]
        };
        source.rpg = {
            xp: 5,
            globalCurrency: 7,
            initialCharacterId: 1,
            characters: [
                { characterId: 0, level: 2, learnedMoveIds: [2, 3] },
                { characterId: 1, level: 1, learnedMoveIds: [4] }
            ]
        };
        centralAccounts._markDirty();
        await centralAccounts.saveNow();

        const { code } = await centralAccounts.generateMergeCode(source.id);
        const savedCode = JSON.parse(await fs.readFile(centralAccounts.filePath, "utf8")).mergeCodes[code];
        assert.equal(savedCode.centralId, source.id);

        const merged = await centralAccounts.useMergeCode(code, target.id);
        const saved = JSON.parse(await fs.readFile(centralAccounts.filePath, "utf8"));

        assert.equal(merged.id, target.id);
        assert.equal(merged.name, "Receiving account");
        assert.deepEqual(merged.webAuth, {
            username: "central-login",
            passwordSalt: "target-salt",
            passwordHash: "target-password-hash",
            rememberedSessions: [{ tokenHash: "target-session" }]
        });
        assert.deepEqual(merged.platformAccounts.map(account => account.platformId), [
            "target-user",
            "source-user"
        ]);
        assert.deepEqual(merged.rpg, {
            xp: 25,
            globalCurrency: 37,
            initialCharacterId: 0,
            characters: [
                { characterId: 0, level: 3, learnedMoveIds: [1, 2, 3] },
                { characterId: 1, level: 1, learnedMoveIds: [4] }
            ]
        });
        assert.equal(saved.centralAccounts[target.id].id, target.id);
        assert.deepEqual(saved.centralAccounts[target.id].webAuth, merged.webAuth);
        assert.deepEqual(saved.centralAccounts[target.id].rpg, merged.rpg);
        assert.equal(saved.centralAccounts[source.id], undefined);
        assert.equal(saved.mergeCodes[code], undefined);

        const unlinked = await centralAccounts.unlinkPlatform(target.id, "telegram");
        assert.equal(unlinked.platformId, "source-user");
        assert.equal(merged.id, target.id);
        assert.deepEqual(merged.webAuth, saved.centralAccounts[target.id].webAuth);
        assert.deepEqual(merged.platformAccounts.map(account => account.platformId), ["target-user"]);

        const savedAfterUnlink = JSON.parse(await fs.readFile(centralAccounts.filePath, "utf8"));
        assert.equal(savedAfterUnlink.centralAccounts[target.id].id, target.id);
        assert.deepEqual(savedAfterUnlink.centralAccounts[target.id].webAuth, merged.webAuth);
        assert.deepEqual(
            savedAfterUnlink.centralAccounts[target.id].platformAccounts.map(account => account.platformId),
            ["target-user"]
        );

        await assert.rejects(centralAccounts.unlinkPlatform(target.id, "discord"), {
            message: "last platform"
        });
        assert.deepEqual(merged.platformAccounts.map(account => account.platformId), ["target-user"]);
    } finally {
        centralAccounts.data = previousData;
        centralAccounts.filePath = previousFilePath;
        centralAccounts.dirty = previousDirty;
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("relinking with a platform code keeps the code owner's web session", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "satbot-central-relink-"));
    const previousData = centralAccounts.data;
    const previousFilePath = centralAccounts.filePath;
    const previousDirty = centralAccounts.dirty;

    try {
        await centralAccounts.init(path.join(directory, "central-accounts.json"));
        const codeOwner = await centralAccounts.getOrCreateByPlatform("whatsapp", "original-user", {
            username: "original-login"
        });
        codeOwner.webAuth = {
            username: "central-login",
            passwordSalt: "salt",
            passwordHash: "hash",
            authVersion: 1,
            rememberedSessions: []
        };
        centralAccounts._markDirty();
        await centralAccounts.saveNow();
        const sessionToken = await centralAccounts.createRememberedWebSession(codeOwner.id);

        const reconnectedAccount = await centralAccounts.getOrCreateByPlatform("discord", "reconnected-user");
        const { code } = await centralAccounts.generateMergeCode(codeOwner.id);
        const merged = await centralAccounts.useMergeCode(code, reconnectedAccount.id, {
            keepCodeOwner: true
        });

        assert.equal(merged.id, codeOwner.id);
        assert.equal(centralAccounts.getCentralById(reconnectedAccount.id), null);
        assert.deepEqual(merged.platformAccounts.map(account => account.platformId), [
            "original-user",
            "reconnected-user"
        ]);
        assert.equal(
            (await centralAccounts.getCentralByRememberedWebSession(sessionToken)).id,
            codeOwner.id
        );
    } finally {
        centralAccounts.data = previousData;
        centralAccounts.filePath = previousFilePath;
        centralAccounts.dirty = previousDirty;
        await fs.rm(directory, { recursive: true, force: true });
    }
});
