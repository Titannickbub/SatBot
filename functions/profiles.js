const config = require("./config");

async function resolvePlatformProfile(platform, id, context = {}) {
    try {
        if (platform === "discord") {
            const client = global.discordClient;
            if (!client) return null;
            const rawMessage = context.raw?.author ? context.raw : context.raw?.message;
            const user = rawMessage?.author && String(rawMessage.author.id) === String(id)
                ? rawMessage.author
                : rawMessage?.mentions?.users?.get?.(String(id)) ||
                    await client.users.fetch(String(id)).catch(() => null);
            if (!user) return null;
            const avatarUrl = user.displayAvatarURL ? user.displayAvatarURL({ size: 256, forceStatic: false }) : null;
            return {
                platform,
                id: String(id),
                name: user.globalName || user.username || null,
                username: user.username || null,
                avatarUrl,
                found: true
            };
        }

        if (platform === "whatsapp") {
            const sock = global.whatsappSock;
            if (!sock) return null;

            const rawId = String(id);
            const cleanId = rawId.replace(/@.*$/, "");
            const whatsappIds = await resolveWhatsAppIds(rawId, sock);
            const primaryJid = whatsappIds[0];
            const alternateJids = Array.from(new Set([
                ...whatsappIds,
                `${cleanId}@s.whatsapp.net`,
                `${cleanId}@c.us`,
                `${cleanId}@lid`
            ].filter(Boolean)));

            let avatarUrl = null;
            if (typeof sock.profilePictureUrl === "function") {
                for (const jid of [primaryJid, ...alternateJids]) {
                    if (avatarUrl) break;
                    try {
                        avatarUrl = await sock.profilePictureUrl(jid, "image");
                    } catch {
                        try {
                            avatarUrl = await sock.profilePictureUrl(jid, "preview");
                        } catch {
                            avatarUrl = null;
                        }
                    }
                }
            }

            if (!avatarUrl) {
                avatarUrl = [primaryJid, ...alternateJids]
                    .map(jid => sock.contacts?.[jid]?.imgUrl)
                    .find(Boolean) || null;
            }

            const contact = alternateJids
                .map(jid => sock.contacts?.[jid])
                .find(Boolean);
            const botIds = [sock.user?.id, sock.user?.lid]
                .filter(Boolean)
                .map(value => String(value).split("@")[0].split(":")[0]);
            const isBotAccount = botIds.includes(cleanId.split(":")[0]);
            const centralName = isBotAccount
                ? null
                : findWhatsAppCentralName(context.centralAccounts || global.centralAccounts, alternateJids);
            const name = isBotAccount
                ? config.getBotName()
                : context.raw?.pushName ||
                    contact?.name || contact?.notify || contact?.verifiedName ||
                    centralName || context.username || null;

            return {
                platform,
                id: String(id),
                name,
                username: null,
                avatarUrl,
                found: true
            };
        }

        if (platform === "telegram") {
            const bot = global.telegramBot;
            if (!bot) return null;

            const numericId = Number(id);
            let name = null;
            let username = null;
            let avatarUrl = null;

            if (context.raw?.from && String(context.raw.from.id) === String(id)) {
                const from = context.raw.from;
                name = [from.first_name, from.last_name].filter(Boolean).join(" ");
                username = from.username || null;
            }

            const rawMessage = context.raw?.message || context.raw;
            const entityUser = rawMessage?.entities
                ?.filter(entity => entity.type === "text_mention" && entity.user)
                .map(entity => entity.user)
                .find(user => String(user.id) === String(id));
            if (entityUser) {
                name = [entityUser.first_name, entityUser.last_name].filter(Boolean).join(" ");
                username = entityUser.username || null;
            }

            if (!name && Number.isSafeInteger(numericId)) {
                try {
                    const chat = await bot.telegram.getChat(numericId);
                    if (chat) {
                        name = [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.title || null;
                        username = chat.username || null;
                    }
                } catch (error) {
                    console.warn(`[PROFILES] Não foi possível resolver o nome do usuário Telegram ${id}:`, error.message || error);
                }
            }

            if (Number.isSafeInteger(numericId)) {
                try {
                    const photos = await bot.telegram.getUserProfilePhotos(numericId, 0, 1);
                    if (photos && photos.total_count > 0 && photos.photos[0]?.length) {
                        const sizes = photos.photos[0];
                        const largestPhoto = sizes[sizes.length - 1];
                        const fileLink = await bot.telegram.getFileLink(largestPhoto.file_id);
                        avatarUrl = typeof fileLink === "string" ? fileLink : fileLink.href || String(fileLink);
                    }
                } catch (error) {
                    console.warn(`[PROFILES] Não foi possível obter o avatar do usuário Telegram ${id}:`, error.message || error);
                }
            }

            return {
                platform,
                id: String(id),
                name,
                username,
                avatarUrl,
                found: true
            };
        }
    } catch (err) {
        console.error("[PROFILES] Falha ao resolver perfil:", err);
    }

    return {
        platform,
        id: String(id),
        name: null,
        username: null,
        avatarUrl: null,
        found: false
    };
}

async function resolveWhatsAppIds(id, sock) {
    const initialId = id.includes("@") ? id : `${id}@s.whatsapp.net`;
    const ids = [initialId];
    const lidMapping = sock.signalRepository?.lidMapping;
    const domain = initialId.split("@")[1];
    const method = domain === "lid" || domain === "hosted.lid"
        ? "getPNForLID"
        : "getLIDForPN";
    if (typeof lidMapping?.[method] === "function") {
        try {
            const mappedId = await lidMapping[method](initialId);
            if (mappedId) ids.push(String(mappedId));
        } catch (error) {
            console.warn(`[PROFILES] Não foi possível resolver o ID WhatsApp ${id}:`, error.message || error);
        }
    }
    return Array.from(new Set(ids.flatMap(value => {
        const [user, server = "s.whatsapp.net"] = value.split("@");
        const cleanUser = user.split(":")[0];
        const canonicalServer = server === "c.us" ? "s.whatsapp.net" : server;
        return [`${cleanUser}@${canonicalServer}`, `${user}@${server}`];
    })));
}

function findWhatsAppCentralName(store, platformIds) {
    if (!store) return null;
    const ids = new Set(platformIds.map(normalizeWhatsAppId));
    let accounts = [];
    if (typeof store.getAllCentralAccounts === "function") {
        accounts = store.getAllCentralAccounts();
    } else if (store.data?.centralAccounts && typeof store.data.centralAccounts === "object") {
        accounts = Object.values(store.data.centralAccounts);
    }
    for (const central of accounts) {
        const account = (central.platformAccounts || []).find(item =>
            item.platform === "whatsapp" && ids.has(normalizeWhatsAppId(item.platformId))
        );
        if (!account) continue;
        const name = account?.displayName || account?.username || central.name;
        if (typeof name === "string" && name.trim()) return name.trim();
    }
    return null;
}

function normalizeWhatsAppId(id) {
    const [user = "", server = "s.whatsapp.net"] = String(id || "").trim().split("@");
    const canonicalServer = server === "c.us" ? "s.whatsapp.net" : server;
    return `${user.split(":")[0]}@${canonicalServer}`.toLowerCase();
}

async function validatePlatformTarget(platform, id, context = {}) {
    const profile = await resolvePlatformProfile(platform, id, context);
    if (profile?.found) {
        return {
            platform,
            id: String(id),
            valid: true,
            profile
        };
    }

    return {
        platform,
        id: String(id),
        valid: false,
        profile
    };
}

module.exports = {
    resolvePlatformProfile,
    validatePlatformTarget
};
