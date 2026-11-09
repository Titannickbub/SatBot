const packageInfo = require("../package.json");

const releaseNotes = Object.freeze({
    features: Object.freeze([
        "A página inicial permanece na home pública; o painel da Conta Central fica em /dashboard.",
        "A página Novidades e os comandos changelog/novidades mostram somente a versão atual.",
        "O cofre calcula o imposto proporcionalmente por hora completa após a primeira hora e deixa mais claras as regras compartilhadas e os saldos e impostos individuais."
    ]),
    fixes: Object.freeze([
        "Alterar as regras do cofre não reinicia o horário da última movimentação dos membros.",
        "Os logs de auditoria são enviados somente para alterações feitas no painel web; comandos administrativos não geram uma mensagem extra de log."
    ]),
    platformSummaries: Object.freeze({
        whatsapp: "O comando novidades/changelog apresenta as notas em mensagem formatada. A home pública e o dashboard agora têm endereços separados.",
        discord: "O comando novidades/changelog apresenta as notas em um embed. O cofre preserva o horário individual ao alterar as regras.",
        telegram: "O comando novidades/changelog apresenta as notas em HTML. A página web separa as novidades e correções da versão atual."
    })
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
