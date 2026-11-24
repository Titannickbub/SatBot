const assert = require("node:assert/strict");
const test = require("node:test");
const rentalDashboard = require("../functions/rentalDashboard");

test("superuser dashboard links to RPG Maker from its navigation and home cards", () => {
    const html = rentalDashboard.render("home", {
        platform: "discord",
        settings: { enabledPlatforms: {} },
        plans: [],
        orders: [],
        subscriptions: [],
        suggestions: [],
        onlyChats: { whitelist: {} }
    });

    assert.equal(
        (html.match(/href="\/painel-rpg-maker\?plataforma=discord"/g) || []).length,
        2
    );
    assert.match(html, /<strong>RPG Maker<\/strong>/);
});
