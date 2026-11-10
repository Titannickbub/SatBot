const packageInfo = require("../package.json");

const releaseNotes = Object.freeze({
    features: Object.freeze([
        "O suporte oficial agora pode ser ativado ou revogado por um superusuário local com aviso no chat; os comandos estão documentados no menu."
    ]),
    fixes: Object.freeze([
        "As configurações de Antilink, Antipalavras, Antimídia, Antiraid e Bloqueio de comandos agora ficam em páginas próprias, com os escopos compatíveis com cada plataforma.",
        "Os cartões de Antilink, Antipalavras e Antimídia no painel principal mantêm o status e o acesso ao painel dedicado, sem atalhos de ativação duplicados.",
        "A configuração de mídias, limites de raid e comandos bloqueados pode ser editada nas respectivas páginas dedicadas.",
        "O painel de Agendamentos permanece separado e permite consultar e editar as configurações de cada chat.",
        "Painéis dedicados para Download automático, Auto-IA, Respostas automáticas, Transcrição automática, Sistema de XP e Registro de atividade, com configurações e gerenciamento por chat ou grupo."
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
