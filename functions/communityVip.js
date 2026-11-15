const { PermissionFlagsBits } = require("discord.js");
const economy = require("./economy");

const roleSyncCache = new Map();

function canManageCommunityVip(message) {
    if (message?.platform === "discord") {
        const permissions = message.raw?.member?.permissions;
        return Boolean(permissions?.has(PermissionFlagsBits.Administrator) ||
            permissions?.has(PermissionFlagsBits.ManageGuild) ||
            permissions?.has(PermissionFlagsBits.ManageRoles) ||
            message.sender?.canManageRoles || message.sender?.isAdmin || message.sender?.isOwner);
    }
    return Boolean(message?.sender?.isAdmin || message?.sender?.isOwner);
}

async function syncDiscordVipRole(guildId, userId, roleId, active) {
    if (!guildId || !userId || !roleId) return false;
    const cacheKey = `${guildId}:${userId}:${roleId}`;
    if (roleSyncCache.get(cacheKey) === active) return true;
    const client = global.discordClient;
    if (!client || (typeof client.isReady === "function" && !client.isReady())) {
        throw new Error("O Discord está offline no momento.");
    }
    const guild = await client.guilds.fetch(String(guildId));
    const [member, role, botMember] = await Promise.all([
        guild.members.fetch(String(userId)),
        guild.roles.fetch(String(roleId)),
        guild.members.me ? Promise.resolve(guild.members.me) : guild.members.fetchMe()
    ]);
    if (!role || role.managed || role.id === guild.id) throw new Error("O cargo VIP local não existe ou não pode ser atribuído.");
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles) ||
        botMember.roles.highest.comparePositionTo(role) <= 0) {
        throw new Error("O bot precisa de Gerenciar Cargos e de um cargo acima do cargo VIP configurado.");
    }
    if (active && !member.roles.cache.has(role.id)) await member.roles.add(role);
    if (!active && member.roles.cache.has(role.id)) await member.roles.remove(role);
    roleSyncCache.set(cacheKey, active);
    return true;
}

async function syncMessageVipRole(message, userId = message?.userId) {
    if (message?.platform !== "discord" || !message.raw?.guild) return false;
    const config = economy.getCommunityVip(message);
    if (!config?.discordRoleId) return false;
    const active = economy.isCommunityVipActive(message, userId);
    return syncDiscordVipRole(message.raw.guild.id, userId, config.discordRoleId, active);
}

async function setMember(message, userId, durationMs, permanent = false) {
    const member = economy.setCommunityVip(message, userId, durationMs, permanent);
    if (message.platform === "discord" && member) {
        const vip = economy.getCommunityVip(message);
        if (vip.discordRoleId) {
            try {
                await syncDiscordVipRole(message.raw?.guild?.id, userId, vip.discordRoleId, true);
            } catch (error) {
                console.error("[VIP_LOCAL] VIP concedido, mas falhou a sincronização do cargo:", error.message || error);
                return { ...member, roleSyncWarning: error.message || "Falha ao sincronizar o cargo VIP." };
            }
        }
    }
    return member;
}

async function removeMember(message, userId) {
    const removed = economy.removeCommunityVip(message, userId);
    let roleSyncWarning = null;
    if (removed && message.platform === "discord") {
        const vip = economy.getCommunityVip(message);
        if (vip.discordRoleId) {
            try {
                await syncDiscordVipRole(message.raw?.guild?.id, userId, vip.discordRoleId, false);
            } catch (error) {
                console.error("[VIP_LOCAL] VIP removido, mas falhou a sincronização do cargo:", error.message || error);
                roleSyncWarning = error.message || "Falha ao sincronizar o cargo VIP.";
            }
        }
    }
    return { removed, roleSyncWarning };
}

async function removeDuration(message, userId, durationMs) {
    const result = economy.removeCommunityVipDuration(message, userId, durationMs);
    let roleSyncWarning = null;
    if (result?.expired && message.platform === "discord") {
        const vip = economy.getCommunityVip(message);
        if (vip.discordRoleId) {
            try {
                await syncDiscordVipRole(message.raw?.guild?.id, userId, vip.discordRoleId, false);
            } catch (error) {
                console.error("[VIP_LOCAL] Tempo removido, mas falhou a sincronização do cargo:", error.message || error);
                roleSyncWarning = error.message || "Falha ao sincronizar o cargo VIP.";
            }
        }
    }
    return result ? { ...result, roleSyncWarning } : null;
}

module.exports = {
    canManageCommunityVip,
    syncDiscordVipRole,
    syncMessageVipRole,
    setMember,
    removeMember,
    removeDuration
};
