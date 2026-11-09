const packageInfo = require("../package.json");

const releaseNotes = Object.freeze({
    features: Object.freeze([]),
    fixes: Object.freeze([
        "As configurações de Antilink, Antipalavras, Antimídia, Antiraid e Bloqueio de comandos agora ficam em páginas próprias, com os escopos compatíveis com cada plataforma.",
        "Os cartões dessas proteções no painel central mantêm o status e o acesso à página dedicada, sem controles de ativação duplicados.",
        "A configuração de mídias, limites de raid e comandos bloqueados pode ser editada nas respectivas páginas dedicadas."
    ]),
    platformSummaries: Object.freeze({})
});

function getCurrentChangelog() {
    return {
        version: String(packageInfo.version || "desconhecida"),
        features: [...releaseNotes.features],
        fixes: [...releaseNotes.fixes],
        platformSummaries: { ...releaseNotes.platformSummaries }
    };
}

module.exports = { getCurrentChangelog };
