const { isOwner } = require("../functions/owners");
const economy = require("../functions/economy");
const communityVip = require("../functions/communityVip");

module.exports = {
    name: "vip",
    priority: 97,
    runOn: "all",

    async execute(message) {
        const vipConfig = economy.getCommunityVip(message);
        if (!vipConfig) return true;

        if (message.platform === "discord" && vipConfig.discordRoleId) {
            try {
                await communityVip.syncMessageVipRole(message);
            } catch (error) {
                console.error("[VIP_LOCAL] Falha ao sincronizar cargo VIP:", error.message || error);
            }
        }

        const text = message.text ? String(message.text).trim() : "";
        const prefix = message.prefix || "!";
        const commandName = text.startsWith(prefix)
            ? text.slice(prefix.length).split(/\s+/)[0].toLowerCase()
            : "";
        if (!commandName || !vipConfig.vipCommands.includes(commandName)) return true;
        if (isOwner(message) || message.sender?.isOwner ||
            economy.isCommunityVipActive(message, String(message.userId))) return true;

        console.log(`[VIP_LOCAL] Comando VIP bloqueado | user: ${message.userId} | command: ${commandName}`);
        if (typeof message.reply === "function") {
            await message.reply({ text: "⚠️ Este comando está disponível apenas para membros VIP deste grupo ou servidor." });
        }
        return false;
    }
};
