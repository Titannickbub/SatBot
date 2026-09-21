const xp = require("../functions/xp");

module.exports = {
    name: "xp",
    aliases: ["meuxp", "perfilxp"],
    category: "xp",
    description: "Mostra seu nível, XP e posição no ranking.",
    usage: "{prefix}xp",

    async execute(message) {
        const data = xp.load(message);
        if (!data) return message.reply({ text: "❌ O XP só funciona em grupos ou servidores." });
        if (!data.enabled) return message.reply({ text: "ℹ️ O sistema de XP está desativado neste grupo/servidor." });

        const user = data.users[String(message.userId)] || { xp: 0 };
        const level = xp.levelForXp(user.xp);
        const remaining = level.nextLevelXp - user.xp;
        const rank = xp.position(message, message.userId) || 1;
        return message.reply({
            text: [
                `📊 PERFIL XP — ${message.displayName || message.username || message.userId}`,
                `Nível: ${level.level}`,
                `XP: ${user.xp}`,
                `Posição: #${rank}`,
                `Faltam: ${remaining} XP para o nível ${level.level + 1}`
            ].join("\n")
        });
    }
};
