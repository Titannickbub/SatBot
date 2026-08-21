/**
 * Helper para concentrar as ações de moderação (kick, ban) entre plataformas.
 */

/**
 * Remove (expulsa) um usuário do grupo/servidor.
 * @param {string} platform A plataforma atual ("discord", "whatsapp", "telegram")
 * @param {object} message O objeto de mensagem contendo raw, userId, chatId
 */
async function kickMember(platform, message, reason = "Punição automática") {
    if (platform === "discord") {
        const guild = message.raw?.guild || global.discordClient?.guilds?.cache.get(message.guildId) || null;
        if (!guild) {
            console.warn("[MODERATION] Discord kick sem guild disponível:", { userId: message.userId, chatId: message.chatId });
            return false;
        }
        try {
            const member = await guild.members.fetch(message.userId).catch(() => null);
            if (!member) {
                console.warn("[MODERATION] Discord kick falhou: membro não encontrado.", { userId: message.userId, guildId: guild.id });
                return false;
            }
            await guild.members.kick(message.userId, { reason });
            return true;
        } catch (err) {
            console.error("❌[MODERATION] Falha ao kickar usuário do Discord:", err && err.message ? err.message : err);
            return false;
        }
    } else if (platform === "telegram") {
        const ctx = message.raw;
        await ctx.telegram
            .banChatMember(message.chatId, Number(message.userId))
            .catch(() => {});
        // No Telegram kick = banir e desbanir imediatamente
        await ctx.telegram
            .unbanChatMember(message.chatId, Number(message.userId))
            .catch(() => {});
    } else if (platform === "whatsapp") {
        await global.whatsappSock
            .groupParticipantsUpdate(message.chatId, [message.userId], "remove")
            .catch(() => {});
    }
}

/**
 * Bane um usuário do grupo/servidor.
 * @param {string} platform A plataforma atual ("discord", "whatsapp", "telegram")
 * @param {object} message O objeto de mensagem contendo raw, userId, chatId
 * @param {string} [reason] Motivo opcional para o banimento
 */
async function banMember(platform, message, reason = "Punição automática") {
    if (platform === "discord") {
        const guild = message.raw?.guild || global.discordClient?.guilds?.cache.get(message.guildId) || null;
        if (!guild) {
            console.warn("[MODERATION] Discord ban sem guild disponível:", { userId: message.userId, chatId: message.chatId });
            return false;
        }
        try {
            await guild.members.ban(message.userId, { reason });
            return true;
        } catch (err) {
            console.error("❌[MODERATION] Falha ao banir usuário do Discord:", err && err.message ? err.message : err);
            return false;
        }
    } else if (platform === "telegram") {
        const ctx = message.raw;
        await ctx.telegram
            .banChatMember(message.chatId, Number(message.userId))
            .catch(() => {});
    } else if (platform === "whatsapp") {
        // WhatsApp não tem ban nativo via Baileys — removemos do grupo.
        await global.whatsappSock
            .groupParticipantsUpdate(message.chatId, [message.userId], "remove")
            .catch(() => {});
    }
}

async function muteMember(platform, message, durationMs = 10 * 60 * 1000, reason = "Mute temporário") {
    if (platform === "discord") {
        const guild = message.raw?.guild || global.discordClient?.guilds?.cache.get(message.guildId) || null;
        if (!guild) return false;
        try {
            const member = await guild.members.fetch(message.userId).catch(() => null);
            if (!member) return false;
            await member.timeout(durationMs, reason);
            return true;
        } catch (err) {
            console.error("❌[MODERATION] Falha ao mutar usuário do Discord:", err && err.message ? err.message : err);
            return false;
        }
    } else if (platform === "telegram") {
        const ctx = message.raw;
        const untilDate = Math.floor(Date.now() / 1000) + Math.round(durationMs / 1000);
        await ctx.telegram.restrictChatMember(message.chatId, Number(message.userId), {
            permissions: {
                can_send_messages: false,
                can_send_media_messages: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false
            },
            until_date: untilDate
        }).catch(() => {});
        return true;
    } else if (platform === "whatsapp") {
        return false;
    }
}

async function unmuteMember(platform, message) {
    if (platform === "discord") {
        const guild = message.raw?.guild;
        if (!guild) return false;
        const member = await guild.members.fetch(message.userId).catch(() => null);
        if (!member) return false;
        await member.timeout(null).catch(() => {});
        return true;
    } else if (platform === "telegram") {
        const ctx = message.raw;
        await ctx.telegram.restrictChatMember(message.chatId, Number(message.userId), {
            permissions: {
                can_send_messages: true,
                can_send_media_messages: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true,
                can_change_info: false,
                can_invite_users: true,
                can_pin_messages: false
            }
        }).catch(() => {});
        return true;
    } else if (platform === "whatsapp") {
        return false;
    }
}

function parseTargetFromMessage(message) {
    const quoted = message.quoted;
    if (quoted?.userId) {
        return {
            targetId: String(quoted.userId),
            targetMessageId: quoted.messageId ? String(quoted.messageId) : null
        };
    }

    const rawArg = message.args?.[0]?.trim();
    if (!rawArg) {
        return { targetId: null, targetMessageId: null };
    }

    const discordMention = rawArg.match(/^<@!?(\d+)>$/);
    if (discordMention) {
        return { targetId: discordMention[1], targetMessageId: null };
    }

    const numericId = rawArg.match(/^(\d+)$/);
    if (numericId) {
        if (message.platform === "whatsapp") {
            return { targetId: `${numericId[1]}@s.whatsapp.net`, targetMessageId: null };
        }
        return { targetId: numericId[1], targetMessageId: null };
    }

    if (message.platform === "whatsapp") {
        const digits = rawArg.replace(/\D/g, "");
        if (digits) {
            return { targetId: `${digits}@s.whatsapp.net`, targetMessageId: null };
        }
    }

    return { targetId: rawArg, targetMessageId: null };
}

function formatUserMention(message, targetId) {
    if (!targetId) return targetId;
    if (message.platform === "discord") {
        return `<@${targetId}>`;
    }
    if (message.platform === "telegram") {
        return `[usuário](tg://user?id=${targetId})`;
    }
    if (message.platform === "whatsapp") {
        const number = targetId.split("@")[0];
        return `@${number}`;
    }
    return targetId;
}

module.exports = {
    kickMember,
    banMember,
    muteMember,
    unmuteMember,
    parseTargetFromMessage,
    formatUserMention
};
