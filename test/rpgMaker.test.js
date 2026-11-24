const assert = require("node:assert/strict");
const test = require("node:test");
const rpgMaker = require("../functions/rpgMaker");

test("global RPG definitions receive sequential IDs and reject duplicate names", () => {
    const catalog = rpgMaker.emptyCatalog();

    assert.deepEqual(rpgMaker.createAttribute(catalog, "Fogo"), { id: 0, nome: "Fogo" });
    assert.deepEqual(rpgMaker.createAttribute(catalog, "Água"), { id: 1, nome: "Água" });
    assert.throws(() => rpgMaker.createAttribute(catalog, "fogo"), /Já existe/);
});

test("move creation validates its global references and required costs", () => {
    const catalog = rpgMaker.emptyCatalog();
    rpgMaker.createAttribute(catalog, "Fogo");
    rpgMaker.createEffect(catalog, "Congelado");

    const move = rpgMaker.createMove(catalog, {
        nome: "Chama",
        dano: 10,
        custo: { mana: 2, stamina: 1, hp: 0 },
        tipoFraquezaId: 0,
        nivelDesbloqueio: 1,
        frases: ["{personagem} atinge {alvo}"],
        efeitos: [0]
    });

    assert.equal(move.id, 0);
    assert.throws(() => rpgMaker.createMove(catalog, {
        nome: "Inválido",
        dano: 1,
        custo: { mana: 0, stamina: 0, hp: 0 },
        tipoFraquezaId: 4,
        nivelDesbloqueio: 1,
        frases: ["Ataque"],
        efeitos: []
    }), /fraqueza inexistente/);
});

test("editing definitions preserves IDs and rejects invalid references without changing the saved move", () => {
    const catalog = rpgMaker.emptyCatalog();
    rpgMaker.createAttribute(catalog, "Fogo");
    rpgMaker.createEffect(catalog, "Queimado");
    const move = rpgMaker.createMove(catalog, {
        nome: "Chama",
        dano: 10,
        custo: { mana: 2, stamina: 1, hp: 0 },
        tipoFraquezaId: 0,
        nivelDesbloqueio: 1,
        frases: ["{personagem} atinge {alvo}"],
        efeitos: [0]
    });

    rpgMaker.updateAttribute(catalog, 0, "Fogo azul");
    rpgMaker.updateEffect(catalog, 0, "Queimadura");
    const updated = rpgMaker.updateMove(catalog, move.id, {
        nome: "Chama intensa",
        dano: 20,
        custo: { mana: 3, stamina: 1, hp: 0 },
        tipoFraquezaId: 0,
        nivelDesbloqueio: 2,
        frases: ["{personagem} atingiu {alvo}"],
        efeitos: [0]
    });

    assert.equal(updated.id, 0);
    assert.equal(updated.dano, 20);
    assert.equal(catalog.fraquezas[0].id, 0);
    assert.equal(catalog.efeitos[0].id, 0);
    assert.throws(() => rpgMaker.updateMove(catalog, 0, {
        nome: "Inválido",
        dano: 1,
        custo: { mana: 0, stamina: 0, hp: 0 },
        tipoFraquezaId: 99,
        nivelDesbloqueio: 1,
        frases: ["Ataque"],
        efeitos: []
    }), /fraqueza inexistente/);
    assert.equal(catalog.golpes[0].dano, 20);
});

test("characters require a valid weakness and clonable characters require Clone Travado", () => {
    const catalog = rpgMaker.emptyCatalog();
    rpgMaker.createAttribute(catalog, "Fogo");
    const cloneMove = rpgMaker.ensureCloneMove(catalog);
    const character = {
        id: 0,
        nome: "Exemplo",
        base: "Original",
        raridade: "comum",
        media: [{ type: "photo", file: "0.png" }],
        hp: 10,
        mana: 0,
        stamina: 0,
        agilidade: 1,
        fraquezas: [],
        podeClonarGolpes: true,
        golpeClonagemId: cloneMove.id,
        limiteGolpesAprendidos: null
    };
    catalog.personagens.push(character);

    assert.throws(() => rpgMaker.validateCatalog(catalog), /fraquezas inválidas/);
    character.fraquezas = [0];
    assert.doesNotThrow(() => rpgMaker.validateCatalog(catalog));

    character.base = "";
    assert.throws(() => rpgMaker.validateCatalog(catalog), /Base do personagem/);
    character.base = "Original";
    assert.doesNotThrow(() => rpgMaker.validateCatalog(catalog));

    character.golpeClonagemId = 99;
    assert.throws(() => rpgMaker.validateCatalog(catalog), /golpe de clonagem/);
});

test("image validation accepts supported signatures and enforces the size limit", () => {
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    assert.equal(rpgMaker.detectImageFormat(pngHeader).ext, "png");
    assert.throws(() => rpgMaker.detectImageFormat(Buffer.from("not an image")), /Formato de imagem inválido/);
    assert.throws(() => rpgMaker.detectImageFormat(Buffer.alloc(rpgMaker.MAX_IMAGE_BYTES + 1)), /até 8 MB/);
});
