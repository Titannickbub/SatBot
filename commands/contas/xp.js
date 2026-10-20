const xp = require("../../functions/xp");

module.exports = {
    name: "xp",
    aliases: ["meuxp", "perfilxp"],
    category: "contas",
    description: `📊 Consulta seu nível, XP acumulado, progresso até o próximo nível e sua posição no ranking do grupo ou servidor.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}xp

O bot exibe seu perfil de experiência com seu nível atual, total de XP, posição no ranking e a quantidade de XP restante para o próximo nível.

⚠️ O sistema de XP precisa estar ativado no grupo ou servidor para contabilizar e exibir os dados.`,
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
