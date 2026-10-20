const { getVipConfig } = require("../functions/config");
const { isOwner } = require("../functions/owners");
const vipHelper = require("../functions/vipHelper");

module.exports = {
    name: "vip",
    priority: 97,
    runOn: "all",

    async execute(message) {
        const vipConfig = getVipConfig();
        const vipOnly = vipConfig.vipOnly || {};
        if (!vipOnly.enabled) {
            return true;
        }

        const isSuperUser = message.sender?.isOwner || isOwner(message);
        if (isSuperUser) {
            return true;
        }

        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        const central = store && typeof store.findByPlatform === 'function' ? store.findByPlatform(message.platform, message.userId) : null;
        const hasVip = central ? vipHelper.hasVip(central.id) : false;
        if (hasVip) {
            return true;
        }

        const text = message.text ? String(message.text).trim() : "";
        const prefix = message.prefix || "!";
        const commandName = text.startsWith(prefix) ? text.split(/\s+/)[0].replace(prefix, "").toLowerCase() : "";
        const vipCommandList = Array.isArray(vipConfig.vipCommands) ? vipConfig.vipCommands.map(c => String(c).toLowerCase()) : [];
        if (commandName && (commandName === "vip" || vipCommandList.includes(commandName))) {
            console.log(`[VIP] ⛔ Comando VIP bloqueado para usuário não VIP | user: ${message.userId} | command: ${commandName}`);
            if (vipOnly.mode === "reply" && typeof message.reply === "function") {
                await message.reply({ text: vipOnly.message || "⚠️ Este chat é exclusivo para membros VIP." }).catch(() => {});
            }
            return false;
        }

        console.log(`[VIP] ⛔ Acesso bloqueado em chat VIP-only | user: ${message.userId} | chatId: ${message.chatId || message.target?.chatId || "unknown"}`);
        if (vipOnly.mode === "reply" && typeof message.reply === "function") {
            await message.reply({ text: vipOnly.message || "⚠️ Este chat é exclusivo para membros VIP." }).catch(() => {});
        }
        return false;
    }
};
