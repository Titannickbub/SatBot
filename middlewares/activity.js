const activity = require("../functions/activity");

module.exports = {
    name: "activity",
    description: "Registra a atividade dos usuários quando o sistema está ativado.",
    priority: -90,
    runOn: "all",

    async execute(message) {
        if (!message?.chatId || !message?.userId || !message?.platform) return true;
        if (message.isPrivate || message.chatType === "private") return true;
        if (message.platform === "discord" && message.raw?.author?.bot) return true;
        if (message.raw?.from?.is_bot) return true;

        const data = activity.load(message);
        if (!data?.enabled) return true;

        const text = String(message.text || "");
        const prefix = String(message.prefix || "!");
        let kind = "message";
        if (text.trim().startsWith(prefix) && text.trim().slice(prefix.length).trim()) {
            kind = "command";
        } else if (message.media?.type === "sticker") {
            kind = "sticker";
        } else if (message.media) {
            kind = "file";
        }

        activity.record(message, kind);
        return true;
    }
};
