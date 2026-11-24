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
    for (const section of ["attributes", "moves", "characters"]) {
        for (const action of ["create", "edit", "list"]) {
            assert.match(html, new RegExp(`data-action-tab="${section}:${action}"`));
        }
    }
    assert.ok(scriptStart >= "<script>".length && scriptEnd > scriptStart);
    assert.doesNotThrow(() => new vm.Script(html.slice(scriptStart, scriptEnd)));
});
