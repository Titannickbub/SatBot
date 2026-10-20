const { getAntiSpamConfig, formatTimeString } = require("../functions/config");

const commandHistory = new Map();
let executionsSinceCleanup = 0;

function getUserKey(message) {
    const chatId = message.chatId || message.guildId || message.serverId || "unknown";
    return `${message.platform || "unknown"}:${chatId}:${message.userId || "unknown"}`;
}

function removeExpiredEntries(now, durationMs) {
    for (const [key, entry] of commandHistory) {
        if (now - entry.lastCommandAt >= durationMs) {
            commandHistory.delete(key);
        }
    }
}

module.exports = {
    name: "antispam",
    priority: 100,
    runOn: "command",

    async execute(message) {
        const config = getAntiSpamConfig();
        if (!config.enabled || message.sender?.isOwner) {
            return true;
        }

        const now = Date.now();
        const durationMs = config.seconds * 1000;
        const key = getUserKey(message);
        const previous = commandHistory.get(key);

        if (previous && now - previous.lastCommandAt < durationMs) {
            if (config.notify && !previous.warned) {
                previous.warned = true;
                const remainingSeconds = Math.ceil((durationMs - (now - previous.lastCommandAt)) / 1000);
                try {
                    await message.reply({
                        text: `⏳ Aguarde ${formatTimeString(remainingSeconds)} antes de usar outro comando.`
                    });
                } catch (error) {
                    console.error("[ANTISPAM] Falha ao enviar aviso de intervalo:", error);
                }
            }
            return false;
        }

        commandHistory.set(key, { lastCommandAt: now, warned: false });

        executionsSinceCleanup += 1;
        if (executionsSinceCleanup >= 256) {
            removeExpiredEntries(now, durationMs);
            executionsSinceCleanup = 0;
        }

        return true;
    }
};
