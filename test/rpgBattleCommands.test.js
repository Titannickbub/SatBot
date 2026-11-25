const assert = require("node:assert/strict");
const test = require("node:test");
const sharp = require("sharp");
const commands = require("../functions/rpgBattleCommands");
const banner = require("../functions/rpgBattleBanner");

test("battle commands are registered separately and challenge targets support mentions and replies", () => {
    const commandNames = [
        "equipe",
        "desafiar",
        "aceitar_desafio",
        "recusar_desafio",
        "ataque",
        "desistir_desafio",
        "status_batalha"
    ];
    for (const name of commandNames) {
        const command = require(`../commands/contas/RPG/${name}`);
        assert.equal(command.name, name);
        assert.equal(typeof command.execute, "function");
        assert.match(command.usage, /^\{prefix\}/);
    }

    const getTarget = commands._internals.getChallengeTargetIdentifier;
    assert.equal(getTarget({
        platform: "discord",
        raw: { mentions: { users: { first: () => ({ id: "mentioned-user" }) } } },
        quoted: { userId: "quoted-user" },
        args: ["argument-user"]
    }), "mentioned-user");
    assert.equal(getTarget({
        platform: "whatsapp",
        quoted: { userId: "quoted-user" },
        args: []
    }), "quoted-user");
    assert.equal(getTarget({
        platform: "telegram",
        args: ["@target"]
    }), "@target");
});

test("challenge payloads include the challenge banner and platform-specific formatting and controls", async () => {
    const challenge = {
        id: "challenge-1",
        challenger: {
            name: "Challenger",
            team: [{
                characterId: 0,
                name: "Fighter",
                level: 2,
                hp: 110,
                maxHp: 110,
                mana: 100,
                maxMana: 100,
                stamina: 75,
                maxStamina: 75,
                effects: []
            }]
        },
        opponent: {
            name: "Target",
            platformId: "123456"
        }
    };

    const discord = await commands._internals.makeChallengePayload({ platform: "discord", prefix: "?" }, challenge, { personagens: [] });
    assert.equal(discord.embed.title, "⚔️ Desafio de batalha RPG");
    assert.match(discord.embed.description, /<@123456>/);
    assert.match(discord.embed.description, /\?aceitar\\_desafio/);
    assert.equal(discord.embed.image.url, "attachment://desafio-challenge-1.png");
    assert.equal(discord.files[0].name, "desafio-challenge-1.png");
    assert.equal(Buffer.isBuffer(discord.files[0].attachment), true);
    const challengeMeta = await sharp(discord.files[0].attachment).metadata();
    assert.equal(challengeMeta.width, banner.BANNER_WIDTH);
    assert.equal(challengeMeta.height, banner.CHALLENGE_BANNER_HEIGHT);
    assert.equal(discord.text, undefined);
    assert.equal(discord.allowedMentions.users[0], "123456");
    assert.equal(discord.components.length, 1);
    assert.equal(discord.components[0].components.length, 2);

    const telegram = await commands._internals.makeChallengePayload({ platform: "telegram", prefix: "?" }, challenge, { personagens: [] });
    assert.equal(Buffer.isBuffer(telegram.image), true);
    assert.equal(telegram.parse_mode, "HTML");
    assert.match(telegram.caption, /tg:\/\/user\?id=123456/);
    assert.match(telegram.caption, /\?recusar_desafio/);
    assert.equal(telegram.reply_markup.inline_keyboard.length, 2);

    const whatsapp = await commands._internals.makeChallengePayload({ platform: "whatsapp" }, {
        ...challenge,
        opponent: { ...challenge.opponent, platformId: "123456@s.whatsapp.net" }
    }, { personagens: [] });
    assert.equal(Buffer.isBuffer(whatsapp.image), true);
    assert.match(whatsapp.caption, /@123456/);
    assert.deepEqual(whatsapp.mentions, ["123456@s.whatsapp.net"]);
});

test("battle payload marks and mentions the player whose turn it is per platform", async () => {
    const battle = {
        id: "battle-1",
        round: 1,
        status: "active",
        platform: "discord",
        chatId: "group-1",
        threadId: null,
        players: [
            {
                name: "Player One",
                platformId: "123456",
                team: [{
                    characterId: 0,
                    name: "Fighter",
                    level: 1,
                    hp: 80,
                    maxHp: 100,
                    mana: 45,
                    maxMana: 100,
                    stamina: 30,
                    maxStamina: 75,
                    effects: []
                }]
            },
            {
                name: "Player Two",
                platformId: "654321",
                team: [{
                    characterId: 0,
                    name: "Target",
                    level: 1,
                    hp: 60,
                    maxHp: 110,
                    mana: 90,
                    maxMana: 100,
                    stamina: 70,
                    maxStamina: 75,
                    effects: []
                }]
            }
        ]
    };
    const store = {
        getTurnState: () => ({
            actor: {
                side: 0,
                characterIndex: 0,
                player: battle.players[0],
                fighter: battle.players[0].team[0]
            },
            target: battle.players[1].team[0],
            availableMoves: []
        })
    };
    const makePayload = platform => commands._internals.makeBattlePayload(
        { platform, prefix: "?" },
        battle,
        store,
        [],
        { personagens: [] }
    );

    const discord = await makePayload("discord");
    assert.match(discord.embed.description, /🔔 Vez de <@123456>/);
    assert.match(discord.embed.description, /Atacante: Fighter/);
    assert.match(discord.embed.description, /Alvo: Target/);
    assert.doesNotMatch(discord.embed.description, /HP 80\/100/);
    assert.doesNotMatch(discord.embed.description, /Rodada 1/);
    assert.equal(discord.text, undefined);
    assert.equal(discord.embed.image.url, "attachment://batalha-battle-1.png");
    assert.equal(discord.files[0].name, "batalha-battle-1.png");
    assert.equal(Buffer.isBuffer(discord.files[0].attachment), true);
    const discordMeta = await sharp(discord.files[0].attachment).metadata();
    assert.equal(discordMeta.format, "png");
    assert.equal(discordMeta.width, banner.BANNER_WIDTH);
    assert.equal(discordMeta.height, banner.BANNER_HEIGHT);
    assert.deepEqual(discord.allowedMentions, { users: ["123456"] });

    const telegram = await makePayload("telegram");
    assert.equal(Buffer.isBuffer(telegram.image), true);
    assert.match(telegram.caption, /<a href="tg:\/\/user\?id=123456">Player One<\/a>/);
    assert.match(telegram.caption, /Atacante: Fighter/);
    assert.match(telegram.caption, /Alvo: Target/);

    battle.players[0].platformId = "123456@s.whatsapp.net";
    const whatsapp = await makePayload("whatsapp");
    assert.equal(Buffer.isBuffer(whatsapp.image), true);
    assert.match(whatsapp.caption, /Vez de @123456/);
    assert.deepEqual(whatsapp.mentions, ["123456@s.whatsapp.net"]);

    battle.players[0].platformId = "123456";
    const previousRegistry = global.platformRegistry;
    let sent;
    global.platformRegistry = {
        discord: {
            sendText: async (...args) => {
                sent = args;
                return "message-1";
            }
        }
    };
    try {
        await commands._internals.sendPublicUpdate(
            { platform: "discord", prefix: "?" },
            battle,
            store,
            [],
            { personagens: [] }
        );
        assert.match(sent[2], /🔔 Vez de <@123456>/);
        assert.equal(sent[3].content, undefined);
        assert.deepEqual(sent[3].allowedMentions, { users: ["123456"] });
        assert.equal(sent[3].files[0].name, "batalha-battle-1.png");
        assert.equal(sent[3].embed.image.url, "attachment://batalha-battle-1.png");
    } finally {
        global.platformRegistry = previousRegistry;
    }
});

test("battle banner renders 3-character teams and proportional HP, mana, and stamina bars", async () => {
    const statBarFull = banner._internals.renderStatBar("HP", 100, 100, "#f07178", 0, 20, 400);
    const statBarHalf = banner._internals.renderStatBar("HP", 50, 100, "#f07178", 0, 20, 400);
    const statBarEmpty = banner._internals.renderStatBar("HP", 0, 100, "#f07178", 0, 20, 400);
    assert.match(statBarFull, /100\/100/);
    assert.match(statBarFull, /width="190"/);
    assert.match(statBarHalf, /50\/100/);
    assert.match(statBarHalf, /width="95"/);
    assert.match(statBarEmpty, /0\/100/);
    assert.doesNotMatch(statBarEmpty, /fill="#f07178"\/>/);

    const battle = {
        id: "3v3-test",
        round: 4,
        status: "active",
        players: [
            {
                name: "Titannickbub",
                team: [
                    { characterId: 0, name: "Bruxa Gélida", level: 5, hp: 105, maxHp: 132, mana: 92, maxMana: 120, stamina: 78, maxStamina: 90, effects: [] },
                    { characterId: 1, name: "Guardião", level: 4, hp: 0, maxHp: 140, mana: 20, maxMana: 80, stamina: 0, maxStamina: 100, effects: [] },
                    { characterId: 2, name: "Oráculo", level: 3, hp: 70, maxHp: 100, mana: 40, maxMana: 150, stamina: 55, maxStamina: 80, effects: [{ name: "Congelado" }] }
                ]
            },
            {
                name: "titannickbub<teste>",
                team: [
                    { characterId: 0, name: "Bruxa Gélida", level: 1, hp: 74, maxHp: 110, mana: 79, maxMana: 100, stamina: 66, maxStamina: 75, effects: [] },
                    { characterId: 3, name: "Sentinela", level: 2, hp: 120, maxHp: 120, mana: 60, maxMana: 60, stamina: 90, maxStamina: 90, effects: [] }
                ]
            }
        ]
    };
    const png = await banner.renderBattleBanner(battle, {
        turn: {
            actor: { side: 1, characterIndex: 0, fighter: battle.players[1].team[0] },
            target: battle.players[0].team[0]
        },
        catalog: { personagens: [] }
    });
    const meta = await sharp(png).metadata();
    assert.equal(meta.format, "png");
    assert.equal(meta.width, 860);
    assert.equal(meta.height, 980);

    const completedBattle = {
        ...battle,
        status: "completed",
        winnerSide: 0,
        reason: "team_defeated",
        xpRewards: [{ amount: 10 }, { amount: 1 }],
        players: [
            { ...battle.players[0], platformId: "111222" },
            { ...battle.players[1], platformId: "333444" }
        ]
    };
    const victoryPayload = await commands._internals.makeBattlePayload(
        { platform: "discord", prefix: "?" },
        completedBattle,
        { getTurnState: () => { throw new Error("should not be called"); } },
        ["Golpe final!"],
        { personagens: [] }
    );
    assert.equal(victoryPayload.embed.title, "🏁 Batalha encerrada");
    assert.equal(victoryPayload.embed.image.url, "attachment://vitoria-3v3-test.png");
    assert.equal(victoryPayload.files[0].name, "vitoria-3v3-test.png");
    assert.match(victoryPayload.embed.description, /🏆 <@111222> venceu!/);
    const victoryMeta = await sharp(victoryPayload.files[0].attachment).metadata();
    assert.equal(victoryMeta.width, banner.BANNER_WIDTH);
    assert.equal(victoryMeta.height, banner.VICTORY_BANNER_HEIGHT);
});

test("team setup directs new players to the catalog and gives owned characters platform controls", () => {
    const guideDiscord = commands._internals.makeInitialCharacterGuide({
        platform: "discord",
        prefix: "?"
    });
    const guideTelegram = commands._internals.makeInitialCharacterGuide({
        platform: "telegram",
        prefix: "?"
    });
    const guideWhatsApp = commands._internals.makeInitialCharacterGuide({
        platform: "whatsapp",
        prefix: "?"
    });
    assert.match(guideDiscord.embed.description, /\?catalogo/);
    assert.equal(guideDiscord.components[0].components[0].data.custom_id, "catalogo:page:1");
    assert.equal(guideTelegram.reply_markup.inline_keyboard[0][0].callback_data, "catalogo:page:1");
    assert.match(guideWhatsApp.text, /\?catalogo/);
    assert.match(guideWhatsApp.text, /\?equipe <id>/);

    const catalog = {
        personagens: [
            { id: 2, nome: "Bruxa Gélida" },
            { id: 3, nome: "Guardião" },
            { id: 4, nome: "Oráculo" },
            { id: 5, nome: "Sentinela" }
        ]
    };
    const profile = {
        teamCharacterIds: [2],
        characters: catalog.personagens.map(character => ({
            characterId: character.id,
            level: 1
        }))
    };
    const discord = commands._internals.makeTeamWizardPayload(
        { platform: "discord", prefix: "?" },
        profile,
        catalog,
        [2]
    );
    const telegram = commands._internals.makeTeamWizardPayload(
        { platform: "telegram", prefix: "?" },
        profile,
        catalog,
        [2]
    );
    const whatsapp = commands._internals.makeTeamWizardPayload(
        { platform: "whatsapp", prefix: "?" },
        profile,
        catalog,
        [2]
    );
    assert.match(discord.embed.description, /1\\. 2 · Bruxa Gélida/);
    assert.ok(discord.components[0].components.some(button =>
        button.data.custom_id === "equipe:save:2"
    ));
    assert.equal(telegram.reply_markup.inline_keyboard[0][0].callback_data, "equipe:pick:2:2:1");
    assert.match(whatsapp.text, /\?equipe <id1> \[id2\] \[id3\]/);
    assert.deepEqual(commands._internals.decodeTeamIds(commands._internals.encodeTeamIds([2, 36, 1296])), [2, 36, 1296]);
});

test("team buttons preserve selections across pages and save the selected order", async () => {
    const catalogStore = require("../functions/rpgMaker");
    const previous = {
        centralAccounts: global.centralAccounts,
        rpgBattle: global.rpgBattle,
        readCatalog: catalogStore.readCatalog
    };
    const catalog = {
        personagens: Array.from({ length: 21 }, (_, index) => ({
            id: index + 1,
            nome: `Personagem ${index + 1}`
        }))
    };
    const profile = {
        teamCharacterIds: [1],
        characters: catalog.personagens.map(character => ({
            characterId: character.id,
            level: 1
        }))
    };
    const savedTeams = [];
    global.centralAccounts = {
        findByPlatform: () => ({ id: "central-player", name: "Player" }),
        getRpgProfile: () => profile
    };
    global.rpgBattle = {
        setTeam: async (_centralId, ids) => {
            savedTeams.push(ids);
            return ids;
        }
    };
    catalogStore.readCatalog = () => catalog;

    const makeInteraction = data => {
        const updates = [];
        const interaction = {
            callbackQuery: { data },
            answerCbQuery: async () => {},
            editMessageText: async (text, options) => updates.push({ text, options })
        };
        interaction[Symbol.for("satbot.componentMessageContext")] = {
            platform: "telegram",
            chatId: "group-1",
            userId: "user-1",
            prefix: "?"
        };
        return { interaction, updates };
    };

    try {
        const page = makeInteraction("equipe:page:2:1");
        assert.equal(await commands.handleInteraction(page.interaction), true);
        assert.ok(page.updates[0].options.reply_markup.inline_keyboard.flat().some(button =>
            button.callback_data === "equipe:pick:l:1:2"
        ));

        const pick = makeInteraction("equipe:pick:2:1:1");
        assert.equal(await commands.handleInteraction(pick.interaction), true);
        assert.ok(pick.updates[0].options.reply_markup.inline_keyboard.flat().some(button =>
            button.callback_data === "equipe:pick:2:1,2:1"
        ));

        const save = makeInteraction("equipe:save:1,2");
        assert.equal(await commands.handleInteraction(save.interaction), true);
        assert.deepEqual(savedTeams, [[1, 2]]);
        assert.deepEqual(save.updates[0].options.reply_markup, { inline_keyboard: [] });
    } finally {
        global.centralAccounts = previous.centralAccounts;
        global.rpgBattle = previous.rpgBattle;
        catalogStore.readCatalog = previous.readCatalog;
    }
});

test("Telegram battle buttons are acknowledged only once if publishing the update fails", async () => {
    const previous = {
        centralAccounts: global.centralAccounts,
        rpgBattle: global.rpgBattle,
        platformRegistry: global.platformRegistry,
        consoleError: console.error
    };
    const account = { id: "central-player", name: "Player" };
    let acknowledgments = 0;
    let sends = 0;
    let loggedError;
    const store = {
        acceptChallenge: async () => ({
            id: "battle-1",
            platform: "telegram",
            chatId: "group-1",
            threadId: null,
            status: "active",
            round: 1,
            roundStartSide: 0,
            roundOrder: [{ characterIndex: 0 }],
            players: [
                {
                    name: "Player",
                    team: [{
                        name: "A",
                        level: 1,
                        hp: 100,
                        maxHp: 100,
                        mana: 10,
                        maxMana: 10,
                        stamina: 10,
                        maxStamina: 10,
                        effects: []
                    }]
                },
                {
                    name: "Opponent",
                    team: [{
                        name: "B",
                        level: 1,
                        hp: 100,
                        maxHp: 100,
                        mana: 10,
                        maxMana: 10,
                        stamina: 10,
                        maxStamina: 10,
                        effects: []
                    }]
                }
            ]
        }),
        getTurnState: () => ({
            actor: {
                player: { name: "Player" },
                fighter: { name: "A" }
            },
            target: { name: "B" },
            availableMoves: []
        })
    };
    global.centralAccounts = {
        findByPlatform: () => account
    };
    global.rpgBattle = store;
    global.platformRegistry = {
        telegram: {
            sendImg: async () => {
                sends += 1;
                throw new Error("send failure");
            }
        }
    };
    console.error = (...args) => {
        loggedError = args;
    };

    const message = {
        platform: "telegram",
        chatId: "group-1",
        chatType: "group",
        isPrivate: false,
        userId: "user-1",
        displayName: "Player",
        functions: {
            centralAccounts: global.centralAccounts,
            rpgBattle: store
        },
        raw: { chat: { id: "group-1" } }
    };
    const interaction = {
        callbackQuery: { data: "equipe:accept:challenge-1" },
        answerCbQuery: async () => {
            acknowledgments += 1;
        }
    };
    interaction[Symbol.for("satbot.componentMessageContext")] = message;

    try {
        assert.equal(await commands.handleInteraction(interaction), true);
        assert.equal(acknowledgments, 1);
        assert.equal(sends, 1, loggedError?.[1]?.stack || String(loggedError?.[1] || ""));
    } finally {
        global.centralAccounts = previous.centralAccounts;
        global.rpgBattle = previous.rpgBattle;
        global.platformRegistry = previous.platformRegistry;
        console.error = previous.consoleError;
    }
});
