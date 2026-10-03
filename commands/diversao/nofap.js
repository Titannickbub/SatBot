const nofapHelper = require("../../functions/nofapHelper");

module.exports = {
    category: "diversão",
    name: "nofap",
    aliases: ["nofapset", "semana"],
    description: "Acompanha sua sequência pessoal no desafio NoFap, salva na conta central e compartilhada entre plataformas. Use `status`, `iniciar`, `reset` ou `sair` para consultar ou controlar sua participação.",
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
