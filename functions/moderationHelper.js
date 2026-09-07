/**
 * Helper para concentrar as ações de moderação (kick, ban) entre plataformas.
 */

function cleanJid(jid) {
    if (!jid) return jid;
    const str = String(jid).trim();
    if (!str.includes("@")) {
        const digits = str.replace(/\D/g, "");
        return digits ? `${digits}@s.whatsapp.net` : str;
    }
    const [userPart, serverPart] = str.split("@");
    const cleanUser = userPart.split(":")[0];
    return `${cleanUser}@${serverPart}`;
}

function sameUserId(left, right) {
    if (!left || !right) return false;
    const leftValue = String(left).trim();
    const rightValue = String(right).trim();
    if (leftValue === rightValue) return true;

    const cleanLeft = leftValue.includes("@")
        ? leftValue.split("@")[0].split(":")[0] + "@" + leftValue.split("@")[1]
        : leftValue.split(":")[0];
    const cleanRight = rightValue.includes("@")
        ? rightValue.split("@")[0].split(":")[0] + "@" + rightValue.split("@")[1]
        : rightValue.split(":")[0];

    if (cleanLeft === cleanRight) return true;

    const digitsLeft = leftValue.replace(/\D/g, "");
    const digitsRight = rightValue.replace(/\D/g, "");
    if (digitsLeft && digitsRight && digitsLeft === digitsRight) return true;

    return false;
}

/**
 * Remove (expulsa) um usuário do grupo/servidor.
 * @param {string} platform A plataforma atual ("discord", "whatsapp", "telegram")
 * @param {object} message O objeto de mensagem contendo raw, userId, chatId
 * @param {string} [reason] Motivo opcional
 */
async function kickMember(platform, message, reason = "Punição automática") {
    if (platform === "discord") {
        const guild = message.raw?.guild || global.discordClient?.guilds?.cache.get(message.guildId) || null;
        if (!guild) {
            console.warn("[MODERATION] Discord kick sem guild disponível:", { userId: message.userId, chatId: message.chatId });
            throw new Error("Guild não disponível para expulsão no Discord.");
        }
        try {
            const member = await guild.members.fetch(message.userId).catch(() => null);
            if (!member) {
                console.warn("[MODERATION] Discord kick falhou: membro não encontrado.", { userId: message.userId, guildId: guild.id });
                throw new Error("Membro não encontrado no servidor.");
            }
            await guild.members.kick(message.userId, { reason });
            return true;
        } catch (err) {
            console.error("❌[MODERATION] Falha ao kickar usuário do Discord:", err && err.message ? err.message : err);
            throw err;
        }
    } else if (platform === "telegram") {
        const ctx = message.raw;
        if (!ctx?.telegram) throw new Error("Contexto do Telegram não disponível.");
        try {
            await ctx.telegram.banChatMember(message.chatId, Number(message.userId));
            // No Telegram kick = banir e desbanir imediatamente
            await ctx.telegram.unbanChatMember(message.chatId, Number(message.userId));
            return true;
        } catch (err) {
            console.error("❌[MODERATION] Falha ao kickar usuário do Telegram:", err && err.message ? err.message : err);
            throw err;
        }
    } else if (platform === "whatsapp") {
        const sock = global.whatsappSock;
        if (!sock || typeof sock.groupMetadata !== "function" || typeof sock.groupParticipantsUpdate !== "function") {
            throw new Error("A conexão do WhatsApp não está disponível.");
        }

        const chatId = message.chatId;
        if (!chatId.endsWith("@g.us")) {
            throw new Error("Comando de expulsão só pode ser usado em grupos do WhatsApp.");
        }

        const metadata = await sock.groupMetadata(chatId);
        const botIds = [sock.user?.id, sock.user?.lid].filter(Boolean);
        const botMember = metadata.participants?.find((p) => {
            const pIds = [p.id, p.lid, p.phoneNumber].filter(Boolean);
            return pIds.some((pId) => botIds.some((bId) => sameUserId(pId, bId)));
        });

        if (!botMember || !botMember.admin) {
            throw new Error("O bot precisa ser administrador do grupo para expulsar membros.");
        }

        const targetId = message.userId;
        const target = metadata.participants?.find((p) => {
            const ids = [p.id, p.lid, p.phoneNumber].filter(Boolean);
            return ids.some((id) => sameUserId(id, targetId));
        });

        if (!target) {
            throw new Error("Usuário não encontrado neste grupo do WhatsApp.");
        }
        if (target.admin) {
            throw new Error("Não é possível expulsar um administrador do grupo.");
        }
        if (botIds.some((bId) => sameUserId(target.id, bId))) {
            throw new Error("Não é possível expulsar o próprio bot.");
        }

        const participantId = target.id || target.lid || target.phoneNumber;
        const cleanParticipant = cleanJid(participantId);
        const result = await sock.groupParticipantsUpdate(chatId, [cleanParticipant], "remove");
        if (Array.isArray(result) && result[0]) {
            const status = String(result[0].status || "");
            if (status && status !== "200" && status !== "207") {
                throw new Error(`WhatsApp não permitiu a remoção (código ${status}).`);
            }
        }
        return true;
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
            throw new Error("Guild não disponível para banimento no Discord.");
        }
        try {
            await guild.members.ban(message.userId, { reason });
            return true;
        } catch (err) {
            console.error("❌[MODERATION] Falha ao banir usuário do Discord:", err && err.message ? err.message : err);
            throw err;
        }
    } else if (platform === "telegram") {
        const ctx = message.raw;
        if (!ctx?.telegram) throw new Error("Contexto do Telegram não disponível.");
        try {
            await ctx.telegram.banChatMember(message.chatId, Number(message.userId));
            return true;
        } catch (err) {
            console.error("❌[MODERATION] Falha ao banir usuário do Telegram:", err && err.message ? err.message : err);
            throw err;
        }
    } else if (platform === "whatsapp") {
        const sock = global.whatsappSock;
        if (!sock || typeof sock.groupMetadata !== "function" || typeof sock.groupParticipantsUpdate !== "function") {
            throw new Error("A conexão do WhatsApp não está disponível.");
        }

        const chatId = message.chatId;
        if (!chatId.endsWith("@g.us")) {
            throw new Error("Comando de ban só pode ser usado em grupos do WhatsApp.");
        }

        const metadata = await sock.groupMetadata(chatId);
        const botIds = [sock.user?.id, sock.user?.lid].filter(Boolean);
        const botMember = metadata.participants?.find((p) => {
            const pIds = [p.id, p.lid, p.phoneNumber].filter(Boolean);
            return pIds.some((pId) => botIds.some((bId) => sameUserId(pId, bId)));
        });

        if (!botMember || !botMember.admin) {
            throw new Error("O bot precisa ser administrador do grupo para banir membros.");
        }

        const targetId = message.userId;
        const target = metadata.participants?.find((p) => {
            const ids = [p.id, p.lid, p.phoneNumber].filter(Boolean);
            return ids.some((id) => sameUserId(id, targetId));
        });

        if (!target) {
            throw new Error("Usuário não encontrado neste grupo do WhatsApp.");
        }
        if (target.admin) {
            throw new Error("Não é possível banir um administrador do grupo.");
        }
        if (botIds.some((bId) => sameUserId(target.id, bId))) {
            throw new Error("Não é possível banir o próprio bot.");
        }

        const participantId = target.id || target.lid || target.phoneNumber;
        const cleanParticipant = cleanJid(participantId);
        const result = await sock.groupParticipantsUpdate(chatId, [cleanParticipant], "remove");
        if (Array.isArray(result) && result[0]) {
            const status = String(result[0].status || "");
            if (status && status !== "200" && status !== "207") {
                throw new Error(`WhatsApp não permitiu a remoção (código ${status}).`);
            }
        }
        return true;
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
            targetId: cleanJid(String(quoted.userId)),
            targetMessageId: quoted.messageId ? String(quoted.messageId) : null
        };
    }

    if (Array.isArray(message.mentionedJids) && message.mentionedJids.length > 0) {
        return {
            targetId: message.platform === "whatsapp" ? cleanJid(String(message.mentionedJids[0])) : String(message.mentionedJids[0]),
            targetMessageId: null
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

    return { targetId: cleanJid(rawArg), targetMessageId: null };
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
        const number = String(targetId).split("@")[0].split(":")[0].replace(/\D/g, "");
        return number ? `@${number}` : targetId;
    }
    return targetId;
}

module.exports = {
    cleanJid,
    sameUserId,
    kickMember,
    banMember,
    muteMember,
    unmuteMember,
    parseTargetFromMessage,
    formatUserMention
};
