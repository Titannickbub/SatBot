const xp = require("../functions/xp");

module.exports = {
    name: "xp",
    priority: -100,
    runOn: "all",

    async execute(message) {
        if (!message.chatId || !message.userId || !message.platform) return;
        if (message.isPrivate || message.chatType === "private") return;
        if (message.platform === "discord" && message.raw?.author?.bot) return;
        if (message.raw?.from?.is_bot) return;

        const result = xp.addMessageXp(message);
        if (!result?.levelUp || result.config.muted) return;

        await xp.notifyLevelUp(message, result.level, result.config, result.reward);
    }
};
