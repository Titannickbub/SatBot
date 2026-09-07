const { sameUserId, cleanJid, formatUserMention } = require("./moderationHelper");

/**
 * Resolve o usuário alvo a partir de resposta à mensagem, menção (@) ou ID/número.
 * @param {object} message Objeto da mensagem
 * @param {number} [argIndex=3] Índice do argumento se informado via texto
 * @returns {{ id: string, mention: string, source: string } | null}
 */
function resolveTargetUser(message, argIndex = 3) {
    // 1. Resposta à mensagem (quote)
    if (message.quoted?.userId) {
        const id = cleanJid(String(message.quoted.userId));
        return {
            id,
            mention: formatUserMention(message, id),
            source: "quote"
        };
    }

    // 2. Menção no WhatsApp
    if (message.platform === "whatsapp" && Array.isArray(message.mentionedJids) && message.mentionedJids.length > 0) {
        const id = cleanJid(String(message.mentionedJids[0]));
        return {
            id,
            mention: formatUserMention(message, id),
            source: "mention"
        };
    }

    // 3. Menção no Discord
    if (message.platform === "discord" && message.raw?.mentions?.users?.size > 0) {
        const user = message.raw.mentions.users.first();
        return {
            id: String(user.id),
            mention: `<@${user.id}>`,
            source: "mention"
        };
    }

    // 4. Menção no Telegram
    if (message.platform === "telegram" && Array.isArray(message.raw?.message?.entities)) {
        const textMention = message.raw.message.entities.find(e => e.type === "text_mention" && e.user);
        if (textMention) {
            const id = String(textMention.user.id);
            return {
                id,
                mention: `[${textMention.user.first_name || "usuário"}](tg://user?id=${id})`,
                source: "mention"
            };
        }
    }

    // 5. Argumento explícito
    const rawArg = message.args?.[argIndex]?.trim();
    if (!rawArg) return null;

    const discordMatch = rawArg.match(/^<@!?(\d+)>$/);
    if (discordMatch) {
        const id = discordMatch[1];
        return {
            id,
            mention: formatUserMention(message, id),
            source: "arg"
        };
    }

    const numericMatch = rawArg.match(/^(\d+)$/);
    if (numericMatch) {
        const id = message.platform === "whatsapp" ? `${numericMatch[1]}@s.whatsapp.net` : numericMatch[1];
        return {
            id: cleanJid(id),
            mention: formatUserMention(message, id),
            source: "arg"
        };
    }

    if (message.platform === "whatsapp") {
        const digits = rawArg.replace(/\D/g, "");
        if (digits) {
            const id = `${digits}@s.whatsapp.net`;
            return {
                id,
                mention: formatUserMention(message, id),
                source: "arg"
            };
        }
    }

    const id = cleanJid(rawArg);
    return {
        id,
        mention: formatUserMention(message, id),
        source: "arg"
    };
}

/**
 * Resolve o cargo do Discord a partir de menção de cargo, ID ou nome.
 * @param {object} message Objeto da mensagem
 * @param {number} [argIndex=3] Índice do argumento inicial
 * @returns {{ id: string, name: string, role?: object, error?: string } | null}
 */
function resolveTargetRole(message, argIndex = 3) {
    if (message.platform !== "discord" || !message.raw?.guild) {
        return { error: "❌ A configuração de cargos é exclusiva do Discord." };
    }

    const guild = message.raw.guild;

    // 1. Menção direta de cargo
    if (message.raw?.mentions?.roles?.size > 0) {
        const role = message.raw.mentions.roles.first();
        return { id: String(role.id), name: role.name, role };
    }

    // 2. Argumento de texto (ID, menção crua ou nome do cargo)
    const rawArg = message.args?.slice(argIndex).join(" ").trim();
    if (!rawArg) return null;

    const mentionMatch = rawArg.match(/^<@&(\d+)>$/);
    if (mentionMatch) {
        const role = guild.roles.cache.get(mentionMatch[1]);
        if (role) return { id: String(role.id), name: role.name, role };
    }

    // Por ID direto
    const byId = guild.roles.cache.get(rawArg);
    if (byId) return { id: String(byId.id), name: byId.name, role: byId };

    // Por nome (case-insensitive)
    const byName = guild.roles.cache.find(r => r.name.toLowerCase() === rawArg.toLowerCase());
    if (byName) return { id: String(byName.id), name: byName.name, role: byName };

    return null;
}

/**
 * Formata a exibição de um cargo no Discord.
 */
function formatRoleMention(roleId, guild = null) {
    if (guild) {
        const role = guild.roles?.cache?.get(roleId);
        if (role) return `\`@${role.name}\` (<@&${roleId}>)`;
    }
    return `<@&${roleId}>`;
}

function isUserWhitelisted(userWhitelist, userId) {
    if (!Array.isArray(userWhitelist) || !userId) return false;
    return userWhitelist.some(u => sameUserId(u, userId));
}

function isUserBlacklisted(userBlacklist, userId) {
    if (!Array.isArray(userBlacklist) || !userId) return false;
    return userBlacklist.some(u => sameUserId(u, userId));
}

function isRoleWhitelisted(roleWhitelist, message) {
    if (message.platform !== "discord" || !Array.isArray(roleWhitelist) || !roleWhitelist.length) return false;
    const memberRoles = message.raw?.member?.roles?.cache
        ? Array.from(message.raw.member.roles.cache.keys())
        : (Array.isArray(message.raw?.member?.roles) ? message.raw.member.roles : []);
    return memberRoles.some(r => roleWhitelist.includes(String(r)));
}

function isRoleBlacklisted(roleBlacklist, message) {
    if (message.platform !== "discord" || !Array.isArray(roleBlacklist) || !roleBlacklist.length) return false;
    const memberRoles = message.raw?.member?.roles?.cache
        ? Array.from(message.raw.member.roles.cache.keys())
        : (Array.isArray(message.raw?.member?.roles) ? message.raw.member.roles : []);
    return memberRoles.some(r => roleBlacklist.includes(String(r)));
}

module.exports = {
    resolveTargetUser,
    resolveTargetRole,
    formatRoleMention,
    isUserWhitelisted,
    isUserBlacklisted,
    isRoleWhitelisted,
    isRoleBlacklisted
};
