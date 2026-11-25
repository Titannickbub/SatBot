const assert = require("node:assert/strict");
const vm = require("node:vm");
const test = require("node:test");
const rpgMakerWeb = require("../functions/rpgMakerWeb");

test("RPG Maker page has create, edit, and list actions for every main section", () => {
    const html = rpgMakerWeb.renderPage("discord");
    const scriptStart = html.indexOf("<script>") + "<script>".length;
    const scriptEnd = html.indexOf("</script>", scriptStart);

    assert.match(html, /data-window-tab="attributes"/);
    assert.match(html, /data-window-tab="moves"/);
    assert.match(html, /data-window-tab="characters"/);
    assert.match(html, /name="afinidadeId"/);
    assert.match(html, /name="danoPassivoPorRodada"/);
    assert.match(html, /Tipo de afinidade/);
    assert.match(html, /Dano passivo por rodada/);
    assert.match(html, /effectPayload/);
    assert.match(html, /name="raridade"/);
    assert.match(html, /name="base"/);
    assert.match(html, /Base\/obra de origem/);
    assert.match(html, /name="sexo"/);
    for (const sex of ["feminino", "masculino", "intersexo", "nao_binario", "agenero", "desconhecido"]) {
        assert.match(html, new RegExp(`<option value="${sex}">`));
    }
    for (const rarity of ["comum", "incomum", "raro", "epico", "lendario"]) {
        assert.match(html, new RegExp(`<option value="${rarity}">`));
    }
    for (const section of ["attributes", "moves", "characters"]) {
        for (const action of ["create", "edit", "list"]) {
            assert.match(html, new RegExp(`data-action-tab="${section}:${action}"`));
        }
    }
    assert.ok(scriptStart >= "<script>".length && scriptEnd > scriptStart);
    assert.doesNotThrow(() => new vm.Script(html.slice(scriptStart, scriptEnd)));
});
