const nofapHelper = require("../../functions/nofapHelper");

module.exports = {
    category: "diversão",
    name: "nofap",
    aliases: ["nofapset", "semana"],
    description: `🔥 Acompanha e gerencia sua sequência de dias no desafio NoFap, salva na sua conta central e compartilhada entre plataformas.

📝 1. Inicie sua contagem no desafio:
{prefix}nofap iniciar

Começa a contabilizar seus dias de sequência e atribui seu título inicial.

📊 2. Consulte seu progresso e estatísticas:
{prefix}nofap status
{prefix}nofap

Exibe seus dias atuais de sequência, recorde pessoal, total de resets e título alcançado.

🔄 3. Caso tenha uma recaída, zere a contagem:
{prefix}nofap reset

Zera sua sequência atual e incrementa o histórico de resets, preservando seu recorde pessoal.

🚪 4. Pause ou saia do desafio:
{prefix}nofap sair

Pausa a contagem dos dias e desativa seu status no desafio.`,
    usage: "{prefix}nofap [status|iniciar|reset|sair|help]",
    examples: [
        "{prefix}nofap status",
        "{prefix}nofap iniciar",
        "{prefix}nofap reset",
        "{prefix}nofap sair"
    ],
    async execute(message) {
        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        const args = (message.text || "").trim().split(/\s+/).slice(1);
        const action = (args[0] || "status").toLowerCase();

        if (!store || typeof store.getOrCreateByPlatform !== "function") {
            return message.reply({ text: "⚠️ O módulo de contas centrais não está disponível." });
        }

        const central = await store.getOrCreateByPlatform(message.platform, message.userId, {
            username: message.username,
            displayName: message.displayName || message.name || message.username || null
        });

        if (!central) {
            return message.reply({ text: "⚠️ Não foi possível carregar a conta central deste usuário." });
        }

        if (["help", "ajuda"].includes(action)) {
            return message.reply({
                text: [
                    "🔥 *NoFap / Setembro*",
                    "",
                    `• ${message.prefix}nofap status — mostra sua sequência atual`,
                    `• ${message.prefix}nofap iniciar — inicia a contagem do desafio`,
                    `• ${message.prefix}nofap reset — zera a sequência atual e salva o reset`,
                    `• ${message.prefix}nofap sair — sai do desafio e pausa sua contagem`,
                    `• ${message.prefix}setembro rank — exibe o ranking do grupo`,
                    `• ${message.prefix}setembro entrar — entra no desafio do grupo atual`,
                    "",
                    "📌 As estatísticas ficam salvas na conta central vinculada ao usuário."
                ].join("\n")
            });
        }

        if (["status", "check"].includes(action)) {
            const status = nofapHelper.getNofapStatus(central.id);
            return message.reply({ text: nofapHelper.formatNofapStatus(status) });
        }

        if (["iniciar", "start", "join"].includes(action)) {
            const status = nofapHelper.startNofap(central.id);
            return message.reply({ text: `✅ Desafio iniciado!\n${nofapHelper.formatNofapStatus(status)}` });
        }

        if (["reset", "zerar", "restart"].includes(action)) {
            const status = nofapHelper.resetNofap(central.id);
            return message.reply({ text: `🔄 Sequência resetada.\n${nofapHelper.formatNofapStatus(status)}` });
        }

        if (["sair", "leave", "stop", "parar"].includes(action)) {
            const status = nofapHelper.leaveNofap(central.id);
            return message.reply({
                text: `🚪 Você saiu do desafio NoFap. Sua contagem foi pausada.\n${nofapHelper.formatNofapStatus(status)}`
            });
        }

        const status = nofapHelper.getNofapStatus(central.id);
        return message.reply({ text: nofapHelper.formatNofapStatus(status) });
    }
};
