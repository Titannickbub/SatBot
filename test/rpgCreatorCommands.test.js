const assert = require("node:assert/strict");
const test = require("node:test");
const creatorCommands = require("../functions/rpgCreatorCommands");

test("character command creator offers every rarity and labels common as the starting tier", async () => {
    let replyPayload;
    const message = {
        platform: "discord",
        reply: async payload => {
            replyPayload = payload;
        }
    };

    await creatorCommands._internals.promptForCharacter(message, {
        step: "raridade",
        data: {}
    });

    const buttons = replyPayload.components.flatMap(row => row.components);
    assert.deepEqual(buttons.map(button => button.data.custom_id), [
        "rpgpersonagem:rarity:comum",
        "rpgpersonagem:rarity:incomum",
        "rpgpersonagem:rarity:raro",
        "rpgpersonagem:rarity:epico",
        "rpgpersonagem:rarity:lendario"
    ]);
    assert.match(replyPayload.text, /personagem inicial gratuito/);
});

test("character command creator asks for the source base", async () => {
    let replyPayload;
    await creatorCommands._internals.promptForCharacter({
        platform: "whatsapp",
        reply: async payload => {
            replyPayload = payload;
        }
    }, {
        step: "base",
        data: { nome: "Teste" }
    });

    assert.match(replyPayload.text, /base\/obra de origem/);
    assert.match(replyPayload.text, /REZERO/);
});

test("character command creator saves the base before continuing to HP", async () => {
    const message = {
        platform: "discord",
        userId: "base-step-test",
        args: ["continuar", "REZERO"],
        reply: async payload => payload
    };
    const key = "rpgpersonagem:discord:base-step-test";
    creatorCommands._internals.drafts.set(key, {
        step: "base",
        data: { nome: "Bruxa Gélida" }
    });

    try {
        const reply = await creatorCommands._internals.executeCharacter(message, message.args);
        assert.equal(creatorCommands._internals.drafts.get(key).data.base, "REZERO");
        assert.equal(creatorCommands._internals.drafts.get(key).step, "hp");
        assert.match(reply.text, /Etapa hp/);
    } finally {
        creatorCommands._internals.drafts.delete(key);
    }
});

test("character command creator rejects an overlong base before advancing", async () => {
    const message = {
        platform: "discord",
        userId: "long-base-test",
        args: ["continuar", "x".repeat(81)],
        reply: async payload => payload
    };
    const key = "rpgpersonagem:discord:long-base-test";
    creatorCommands._internals.drafts.set(key, {
        step: "base",
        data: { nome: "Teste" }
    });

    try {
        await assert.rejects(
            creatorCommands._internals.executeCharacter(message, message.args),
            /base pode ter até 80 caracteres/
        );
        assert.equal(creatorCommands._internals.drafts.get(key).step, "base");
    } finally {
        creatorCommands._internals.drafts.delete(key);
    }
});
