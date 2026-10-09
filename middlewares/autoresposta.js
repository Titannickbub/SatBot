const { findMatchingResponse } = require("../functions/autorepoHelper");

module.exports = {
    name: "autoresposta",
    priority: 45, // Executa em paralelo/após filtros de segurança e autoia
    runOn: "all",

    async execute(message) {
        // Ignora no PV
        if (message.isPrivate) return true;

        // Ignora em comunidades
        if (message.isCommunity) return true;

        // Ignora mensagens do próprio bot
        if (message.fromMe || message.sender?.isBot) return true;

        const text = typeof message.text === "string" ? message.text.trim() : "";
        if (!text) return true;

        // Ignora comandos
        const prefix = message.prefix || "!";
        if (message.isCommand || text.startsWith(prefix)) return true;

        try {
            const matched = findMatchingResponse(message, text);
            if (!matched) return true;

            if (matched.action === "react") {
                if (typeof message.react === "function") {
                    await message.react(matched.content).catch(() => {});
                }
                return true; // Reações não precisam interromper outros fluxos
            }

            if (matched.action === "reply") {
                if (typeof message.reply === "function") {
                    await message.reply({ text: matched.content }).catch(() => {});
                }
                return false; // Interrompe a propagação da mensagem após responder
            }

            return true;
        } catch (err) {
            console.error("❌[AUTOREPOSTA] Erro ao processar resposta automática:", err.message || err);
            return true;
        }
    }
};
