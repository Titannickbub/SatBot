const centralAccountsStore = require("../functions/centralAccounts");
const { updateParticipantInteraction } = require("../functions/nofapGroupHelper");

module.exports = {
    name: "trackInteraction",
    description: "Registra última interação para contas centrais e para o desafio NoFap/Setembro.",
    priority: 20,
    runOn: "all",
    async execute(message) {
        if (!message || !message.platform || !message.userId) return true;

        try {
            const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts || centralAccountsStore;
            if (store && typeof store.getOrCreateByPlatform === "function") {
                const central = await store.getOrCreateByPlatform(message.platform, message.userId, {
                    username: message.username,
                    displayName: message.displayName || message.name || message.username || null
                });
                if (central && typeof store.setLastInteraction === "function") {
                    await store.setLastInteraction(central.id, new Date().toISOString());
                }

                if (message.chatId && String(message.chatId).endsWith("@g.us")) {
                    updateParticipantInteraction(message.platform, message.chatId, central.id, {
                        name: message.username || message.displayName || message.name || "Usuário",
                        platform: message.platform,
                        platformId: message.userId,
                        lastInteraction: new Date().toISOString(),
                        active: true
                    });
                }
            }
        } catch (err) {
            console.error("[TRACK_INTERACTION] Erro ao atualizar interação:", err);
        }

        return true;
    }
};
