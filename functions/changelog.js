const packageInfo = require("../package.json");

const releaseNotes = Object.freeze({
    features: Object.freeze([
        "Adicionadas figurinhas com áudio no WhatsApp pelos comandos sa, fa e ra."
    ]),
    fixes: Object.freeze([
        "Corrigido e validado o fluxo de união de Contas Centrais, preservando o acesso e os dados da conta após vincular plataformas."
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
