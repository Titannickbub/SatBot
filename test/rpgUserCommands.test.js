const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const test = require("node:test");
const rpgCommands = require("../functions/rpgUserCommands");
const catalogStore = require("../functions/rpgMaker");

const catalog = {
    fraquezas: [
        { id: 0, nome: "Gelo" },
        { id: 1, nome: "Fogo" }
    ],
    efeitos: [{ id: 0, nome: "Congelado" }],
    golpes: [
        {
            id: 0, nome: "Estilhaço de Geada", nivelDesbloqueio: 1
        },
        {
            id: 1, nome: "Névoa Entorpecente", nivelDesbloqueio: 3
        }
    ],
    personagens: [
        {
            id: 0,
            nome: "Bruxa Gélida",
            base: "REZERO",
            sexo: "feminino",
            raridade: "comum",
            media: [{ type: "photo", file: "0.jpg" }],
            hp: 110,
            mana: 100,
            stamina: 75,
            agilidade: 12,
            fraquezas: [1],
            afinidades: [0],
            podeClonarGolpes: false,
            golpesPermanentes: [0, 1],
            limiteGolpesAprendidos: 4
        }
    ]
};

test("character card renders game stats and portrait into a PNG banner", async () => {
    const portrait = await sharp({
        create: {
            width: 80,
            height: 120,
            channels: 3,
            background: "#d8efff"
        }
    }).jpeg().toBuffer();

    const card = await rpgCommands._internals.renderCharacterCard(
        catalog.personagens[0],
        catalog,
        portrait
    );
    const metadata = await sharp(card).metadata();

    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 675);

    const { data, info } = await sharp(card).raw().toBuffer({ resolveWithObject: true });
    const pixelAt = (x, y) => [...data.subarray((y * info.width + x) * info.channels,
        (y * info.width + x) * info.channels + 3)];
    const statBars = [
        pixelAt(570, 283),
        pixelAt(864, 283),
        pixelAt(570, 385),
        pixelAt(864, 385)
    ];
    assert.equal(new Set(statBars.map(pixel => pixel.join(","))).size, 4);
});

test("character cards return to their source base and offer initial choice when eligible", () => {
    const character = catalog.personagens[0];
    const discord = rpgCommands._internals.makeCardComponents(
        "discord",
        character,
        "rpgcatalogo",
        3,
        true,
        { returnBaseIndex: 2, basesPage: 1 }
    );
    const telegram = rpgCommands._internals.makeCardComponents(
        "telegram",
        character,
        "rpgcatalogo",
        3,
        true,
        { returnBaseIndex: 2, basesPage: 1 }
    );
    const whatsapp = rpgCommands._internals.makeCardComponents(
        "whatsapp",
        character,
        "rpgcatalogo",
        3,
        true
    );

    assert.equal(
        discord.components[0].components[0].data.custom_id,
        "catalogo:backbase:2:3:1"
    );
    assert.equal(
        discord.components[1].components[0].data.custom_id,
        "catalogo:initial:0"
    );
    assert.equal(telegram.reply_markup.inline_keyboard[0][0].callback_data, "catalogo:backbase:2:3:1");
    assert.equal(telegram.reply_markup.inline_keyboard[1][0].callback_data, "catalogo:initial:0");
    assert.deepEqual(whatsapp, {});
});

test("character lookup accepts accent-insensitive names and reports ambiguous matches", () => {
    assert.equal(
        rpgCommands._internals.findCharacter(catalog, "bruxa gelida").id,
        0
    );
    assert.throws(
        () => rpgCommands._internals.findCharacter({
            ...catalog,
            personagens: [
                ...catalog.personagens,
                { ...catalog.personagens[0], id: 1, nome: "Bruxa Gélida Sombria" }
            ]
        }, "bruxa"),
        /vários personagens/
    );
});

test("RPG user actions are registered as separate commands", () => {
    const commands = [
        require("../commands/contas/RPG/rpg"),
        require("../commands/contas/RPG/rpgpersonagens"),
        require("../commands/contas/RPG/rpgcatalogo"),
        require("../commands/contas/RPG/rpgver"),
        require("../commands/contas/RPG/ascensao")
    ];

    assert.deepEqual(commands.map(command => command.name), [
        "rpg",
        "meus_personagens",
        "catalogo",
        "rpgver",
        "ascensao"
    ]);
    assert.ok(commands.every(command => command.usage.startsWith("{prefix}")));
});

test("RPG command displays one profile and catalog help describes the selection flow", async () => {
    let payload;
    const central = { id: "profile-test", name: "Jogador" };
    const message = {
        platform: "whatsapp",
        userId: "123",
        prefix: "?",
        args: [],
        functions: {
            centralAccounts: {
                findByPlatform: () => central,
                getRpgProfile: () => ({
                    xp: 42,
                    ascensao: 0,
                    globalCurrency: 0,
                    initialCharacterId: null,
                    characters: []
                })
            }
        },
        reply: async value => {
            payload = value;
            return value;
        }
    };

    await require("../commands/contas/RPG/rpg").execute(message);
    assert.match(payload.text, /PERFIL RPG/);
    assert.match(payload.text, /XP de RPG: 42/);
    assert.match(payload.text, /Nível da Conta: 1/);
    assert.match(payload.text, /Ascensão: 0 ponto/);
    assert.match(payload.text, /Personagem inicial/);

    await rpgCommands._internals.executeAction(message, "catalog", ["help"]);
    assert.match(payload.text, /COMO USAR O CATÁLOGO RPG/);
    assert.match(payload.text, /\?catalogo base/);
});

test("owned character cards offer Ascensão and the command spends a point", async () => {
    const card = rpgCommands._internals.makeCardComponents(
        "discord",
        { id: 8, nome: "Personagem" },
        "rpgpersonagens",
        1,
        false,
        { canAscend: true }
    );
    assert.equal(card.components[0].components[1].data.custom_id, "meus_personagens:ascend:8");

    let payload;
    const profile = {
        xp: 0,
        ascensao: 1,
        globalCurrency: 0,
        initialCharacterId: null,
        characters: [{ characterId: 8, level: 2, learnedMoveIds: [] }]
    };
    const central = { id: "ascension-test", name: "Jogador" };
    const message = {
        platform: "whatsapp",
        userId: "123",
        args: ["8"],
        functions: {
            centralAccounts: {
                findByPlatform: () => central,
                getRpgProfile: () => profile,
                updateRpgProfile: async (id, update) => update(profile)
            }
        },
        reply: async value => {
            payload = value;
            return value;
        }
    };

    const originalReadCatalog = catalogStore.readCatalog;
    catalogStore.readCatalog = () => ({
        fraquezas: [],
        efeitos: [],
        golpes: [],
        personagens: [{ id: 8, nome: "Personagem" }]
    });
    try {
        await require("../commands/contas/RPG/ascensao").execute(message);
    } finally {
        catalogStore.readCatalog = originalReadCatalog;
    }
    assert.match(payload.text, /agora está no nível 3/);
    assert.match(payload.text, /Pontos de Ascensão restantes: 0/);
});

test("character lists paginate ten items and expose previous and next buttons", () => {
    const items = Array.from({ length: 21 }, (_, id) => ({ id, nome: `Personagem ${id}` }));
    const firstPage = rpgCommands._internals.makePagedResponse({
        platform: "discord",
        commandName: "catalogo",
        title: "Catálogo",
        items,
        page: 1,
        renderItem: character => `${character.id} · ${character.nome}`,
        viewableCharacters: items.slice(0, 10)
    });
    const middlePage = rpgCommands._internals.makePagedResponse({
        platform: "telegram",
        commandName: "catalogo",
        title: "Catálogo",
        items,
        page: 2,
        renderItem: character => `${character.id} · ${character.nome}`
    });

    assert.match(firstPage.text, /Personagem 9/);
    assert.doesNotMatch(firstPage.text, /Personagem 10/);
    assert.equal(firstPage.components[0].components[0].data.custom_id, "catalogo:view:0:1");
    assert.equal(firstPage.components[2].components[0].data.custom_id, "catalogo:page:2");
    assert.deepEqual(
        middlePage.reply_markup.inline_keyboard.at(-1).map(button => button.callback_data),
        ["catalogo:page:1", "catalogo:page:3"]
    );
    assert.equal(rpgCommands._internals.parsePage([]), 1);
    assert.equal(rpgCommands._internals.parsePage(["pagina", "3"]), 3);
    assert.throws(() => rpgCommands._internals.parsePage(["0"]), /página válido/);
});

test("catalog starts with base buttons and only lists characters after a base is selected", async () => {
    const originalReadCatalog = catalogStore.readCatalog;
    catalogStore.readCatalog = () => ({
        ...catalog,
        personagens: [
            catalog.personagens[0],
            { ...catalog.personagens[0], id: 1, nome: "Personagem Original", base: "ORIGINAL <&>" }
        ]
    });

    try {
        let payload;
        const central = { id: "catalog-bases-test" };
        const profile = {
            xp: 0,
            globalCurrency: 0,
            initialCharacterId: null,
            characters: []
        };
        const message = {
            platform: "discord",
            userId: "123",
            functions: {
                centralAccounts: {
                    findByPlatform: () => central,
                    getRpgProfile: () => profile
                }
            },
            reply: async value => {
                payload = value;
            }
        };

        await rpgCommands._internals.executeAction(message, "catalog");
        assert.match(payload.embed.title, /BASES DO CATÁLOGO RPG/);
        assert.match(payload.embed.description, /Base 1 · ORIGINAL/);
        assert.match(payload.embed.description, /Base 2 · REZERO/);
        assert.match(payload.embed.description, /Você ainda não possui personagens/);
        assert.doesNotMatch(payload.embed.description, /Bruxa Gélida|Personagem Original/);
        assert.equal(payload.components[0].components[0].data.custom_id, "catalogo:base:1:1");

        profile.characters.push({ characterId: 1, level: 1, learnedMoveIds: [] });
        await rpgCommands._internals.executeAction(message, "catalog");
        assert.doesNotMatch(payload.embed.description, /Você ainda não possui personagens/);

        profile.characters.length = 0;
        message.platform = "telegram";
        await rpgCommands._internals.executeAction(message, "catalog");
        assert.equal(payload.parse_mode, "HTML");
        assert.match(payload.text, /<b>📚 BASES DO CATÁLOGO RPG<\/b>/);
        assert.match(payload.text, /🎬 <b>Base 1 · ORIGINAL &lt;&amp;&gt;<\/b>/);

        message.platform = "discord";
        await rpgCommands._internals.executeAction(message, "catalog", ["base", "2"]);
        assert.match(payload.embed.description, /BASE: REZERO/);
        assert.match(payload.embed.description, /Bruxa Gélida/);
        assert.doesNotMatch(payload.embed.description, /Personagem Original/);
        assert.equal(payload.components[0].components[0].data.custom_id, "catalogo:view:0:1:2:1");
        assert.equal(payload.components.at(-1).components[0].data.custom_id, "catalogo:basespage:1");
    } finally {
        catalogStore.readCatalog = originalReadCatalog;
    }
});

test("Discord and Telegram catalog buttons open a character card with return and initial actions", async () => {
    const originalReadCatalog = catalogStore.readCatalog;
    const originalMediaDir = catalogStore.MEDIA_DIR;
    const mediaDir = await fs.mkdtemp(path.join(os.tmpdir(), "rpg-catalog-"));
    const portrait = await sharp({
        create: {
            width: 80,
            height: 120,
            channels: 3,
            background: "#d8efff"
        }
    }).jpeg().toBuffer();
    await fs.writeFile(path.join(mediaDir, "0.jpg"), portrait);
    catalogStore.MEDIA_DIR = mediaDir;
    catalogStore.readCatalog = () => catalog;

    const central = { id: "catalog-button-test", name: "Jogador" };
    const profile = {
        xp: 0,
        globalCurrency: 0,
        initialCharacterId: null,
        characters: []
    };
    const makeMessage = platform => ({
        platform,
        userId: "123",
        functions: {
            centralAccounts: {
                findByPlatform: () => central,
                getRpgProfile: () => profile
            }
        }
    });

    try {
        profile.characters.push({ characterId: 0, level: 2, learnedMoveIds: [0] });
        const ownedMessage = {
            ...makeMessage("discord"),
            reply: async payload => payload
        };
        const ownedList = await rpgCommands._internals.executeAction(ownedMessage, "personagens");
        assert.equal(
            ownedList.components[0].components[0].data.custom_id,
            "meus_personagens:view:0:1"
        );

        let ownedCard;
        const ownedView = {
            customId: "meus_personagens:view:0:1",
            [Symbol.for("satbot.componentMessageContext")]: makeMessage("discord"),
            reply: async payload => {
                ownedCard = payload;
            }
        };
        await rpgCommands.handleInteraction(ownedView, ["meus_personagens"]);
        assert.deepEqual(
            ownedCard.components.map(row => row.components[0].data.custom_id),
            ["meus_personagens:back:1", "catalogo:initial:0"]
        );

        let ownedListPage;
        const ownedBack = {
            customId: "meus_personagens:back:1",
            [Symbol.for("satbot.componentMessageContext")]: makeMessage("discord"),
            update: async payload => {
                ownedListPage = payload;
            }
        };
        await rpgCommands.handleInteraction(ownedBack, ["meus_personagens"]);
        assert.equal(
            ownedListPage.components[0].components[0].data.custom_id,
            "meus_personagens:view:0:1"
        );

        profile.characters = [];
        let discordCharacterList;
        const discordBase = {
            customId: "catalogo:base:1:1",
            [Symbol.for("satbot.componentMessageContext")]: makeMessage("discord"),
            update: async payload => {
                discordCharacterList = payload;
            }
        };
        await rpgCommands.handleInteraction(discordBase, ["catalogo"]);
        assert.match(discordCharacterList.embeds[0].data.description, /BASE: REZERO/);
        assert.equal(
            discordCharacterList.components[0].components[0].data.custom_id,
            "catalogo:view:0:1:1:1"
        );

        let discordPayload;
        const discordInteraction = {
            customId: "catalogo:view:0:1:1:1",
            [Symbol.for("satbot.componentMessageContext")]: makeMessage("discord"),
            reply: async payload => {
                discordPayload = payload;
            }
        };
        await rpgCommands.handleInteraction(discordInteraction, ["catalogo"]);

        assert.equal(discordPayload.files[0].name, "rpg-personagem-0.png");
        assert.equal(discordPayload.embeds[0].data.title, "Bruxa Gélida");
        assert.equal(typeof discordPayload.embeds[0].data.color, "number");
        assert.deepEqual(
            discordPayload.components.map(row => row.components[0].data.custom_id),
            ["catalogo:backbase:1:1:1", "catalogo:initial:0"]
        );

        let telegramCharacterList;
        const telegramBase = {
            callbackQuery: {
                data: "catalogo:base:1:1",
                message: {}
            },
            [Symbol.for("satbot.componentMessageContext")]: makeMessage("telegram"),
            answerCbQuery: async () => {},
            editMessageText: async (text, options) => {
                telegramCharacterList = { text, options };
            }
        };
        await rpgCommands.handleInteraction(telegramBase, ["catalogo"]);
        assert.equal(
            telegramCharacterList.options.reply_markup.inline_keyboard[0][0].callback_data,
            "catalogo:view:0:1:1:1"
        );
        assert.equal(telegramCharacterList.options.parse_mode, "HTML");
        assert.match(telegramCharacterList.text, /<b>📚 PERSONAGENS DA BASE<\/b>/);

        let telegramPhotoOptions;
        const telegramInteraction = {
            callbackQuery: {
                data: "catalogo:view:0:1:1:1",
                message: {}
            },
            [Symbol.for("satbot.componentMessageContext")]: makeMessage("telegram"),
            answerCbQuery: async () => {},
            replyWithPhoto: async (_photo, options) => {
                telegramPhotoOptions = options;
            }
        };
        await rpgCommands.handleInteraction(telegramInteraction, ["catalogo"]);

        assert.deepEqual(
            telegramPhotoOptions.reply_markup.inline_keyboard.map(row => row[0].callback_data),
            ["catalogo:backbase:1:1:1", "catalogo:initial:0"]
        );
        assert.equal(telegramPhotoOptions.parse_mode, "HTML");
        assert.match(telegramPhotoOptions.caption, /<b>Bruxa Gélida<\/b>/);

        let discordList;
        const discordBack = {
            customId: "catalogo:backbase:1:1:1",
            [Symbol.for("satbot.componentMessageContext")]: makeMessage("discord"),
            update: async payload => {
                discordList = payload;
            }
        };
        await rpgCommands.handleInteraction(discordBack, ["catalogo"]);
        assert.match(discordList.embeds[0].data.description, /BASE: REZERO/);
        assert.equal(discordList.components[0].components[0].data.custom_id, "catalogo:view:0:1:1:1");

        let telegramList;
        const telegramBack = {
            callbackQuery: {
                data: "catalogo:backbase:1:1:1",
                message: { chat: { id: 123 }, message_id: 456, photo: [{}] }
            },
            [Symbol.for("satbot.componentMessageContext")]: makeMessage("telegram"),
            answerCbQuery: async () => {},
            editMessageCaption: async () => {},
            telegram: {
                sendMessage: async (_chatId, text, options) => {
                    telegramList = { text, options };
                }
            }
        };
        await rpgCommands.handleInteraction(telegramBack, ["catalogo"]);
        assert.match(telegramList.text, /<b>📂 BASE: REZERO<\/b>/);
        assert.equal(
            telegramList.options.reply_markup.inline_keyboard[0][0].callback_data,
            "catalogo:view:0:1:1:1"
        );
    } finally {
        catalogStore.readCatalog = originalReadCatalog;
        catalogStore.MEDIA_DIR = originalMediaDir;
        await fs.rm(mediaDir, { recursive: true, force: true });
    }
});

test("WhatsApp catalog lists bases first and pages characters only within a selected base", async () => {
    const originalReadCatalog = catalogStore.readCatalog;
    const originalMediaDir = catalogStore.MEDIA_DIR;
    const mediaDir = await fs.mkdtemp(path.join(os.tmpdir(), "rpg-whatsapp-catalog-"));
    const portrait = await sharp({
        create: {
            width: 80,
            height: 120,
            channels: 3,
            background: "#d8efff"
        }
    }).jpeg().toBuffer();
    await fs.writeFile(path.join(mediaDir, "0.jpg"), portrait);
    catalogStore.MEDIA_DIR = mediaDir;
    const characters = [
        ...Array.from({ length: 11 }, (_, id) => ({
            ...catalog.personagens[0],
            id,
            nome: `Personagem ${id}`,
            base: "REZERO"
        })),
        ...Array.from({ length: 11 }, (_, id) => ({
            ...catalog.personagens[0],
            id: id + 11,
            nome: `Base ${id}`,
            base: `BASE ${id}`
        }))
    ];
    catalogStore.readCatalog = () => ({
        ...catalog,
        personagens: characters
    });

    try {
        const central = { id: "whatsapp-test", name: "Jogador" };
        const message = {
            platform: "whatsapp",
            userId: "123",
            prefix: "?",
            functions: {
                centralAccounts: {
                    findByPlatform: () => central,
                    getRpgProfile: () => ({
                        xp: 0,
                        globalCurrency: 0,
                        initialCharacterId: null,
                        characters: []
                    })
                }
            },
            reply: async payload => payload,
            replyImg: async payload => payload
        };

        const baseList = await rpgCommands._internals.executeAction(message, "catalog");
        const secondBasePage = await rpgCommands._internals.executeAction(message, "catalog", ["2"]);
        const selectedBase = await rpgCommands._internals.executeAction(message, "catalog", ["base", "12"]);
        const secondCharacterPage = await rpgCommands._internals.executeAction(message, "catalog", ["base", "12", "2"]);
        const characterCard = await rpgCommands._internals.executeAction(message, "catalog", [
            "ver", "0", "base", "12", "pagina", "2"
        ]);

        assert.match(baseList.text, /\*📚 BASES DO CATÁLOGO RPG\*/);
        assert.match(baseList.text, /Você ainda não possui personagens/);
        assert.match(baseList.text, /BASE 0/);
        assert.doesNotMatch(baseList.text, /Personagem 0/);
        assert.match(secondBasePage.text, /Página 2\/2/);
        assert.match(secondBasePage.text, /\*Base 12:\* REZERO/);
        assert.match(selectedBase.text, /\*Página 1\/2\*/);
        assert.match(selectedBase.text, /Personagem 9/);
        assert.doesNotMatch(selectedBase.text, /Personagem 10|BASE 0/);
        assert.match(secondCharacterPage.text, /\*Página 2\/2\*/);
        assert.match(secondCharacterPage.text, /Personagem 10/);
        assert.match(characterCard.caption, /↩️ \*Voltar:\* `\?catalogo base 12 2`/);
        assert.match(characterCard.caption, /\?catalogo escolher 0/);
    } finally {
        catalogStore.readCatalog = originalReadCatalog;
        catalogStore.MEDIA_DIR = originalMediaDir;
        await fs.rm(mediaDir, { recursive: true, force: true });
    }
});
