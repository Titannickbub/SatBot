async function resolvePlatformProfile(platform, id, context = {}) {
    try {
        if (platform === "discord") {
            const client = global.discordClient;
            if (!client) return null;
            const user = await client.users.fetch(id).catch(() => null);
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
            const primaryJid = `${cleanId}@s.whatsapp.net`;
            const altJid = rawId.endsWith("@c.us") ? rawId : `${cleanId}@c.us`;

            let avatarUrl = null;
            if (typeof sock.profilePictureUrl === "function") {
                try {
                    avatarUrl = await sock.profilePictureUrl(primaryJid, "image");
                } catch {
                    avatarUrl = null;
                }

                if (!avatarUrl && altJid !== primaryJid) {
                    try {
                        avatarUrl = await sock.profilePictureUrl(altJid, "image");
                    } catch {
                        avatarUrl = null;
                    }
                }

                if (!avatarUrl) {
                    try {
                        avatarUrl = await sock.profilePictureUrl(primaryJid, "preview");
                    } catch {
                        avatarUrl = null;
                    }
                }

                if (!avatarUrl && altJid !== primaryJid) {
                    try {
                        avatarUrl = await sock.profilePictureUrl(altJid, "preview");
                    } catch {
                        avatarUrl = null;
                    }
                }
            }

            if (!avatarUrl) {
                avatarUrl = sock.contacts?.[primaryJid]?.imgUrl || sock.contacts?.[altJid]?.imgUrl || null;
            }

            const name = context.username || context.raw?.pushName || null;

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

            if (!name && !isNaN(numericId)) {
                try {
                    const chat = await bot.telegram.getChat(numericId);
                    if (chat) {
                        name = [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.title || null;
                        username = chat.username || null;
                    }
                } catch {}
            }

            if (!isNaN(numericId)) {
                try {
                    const photos = await bot.telegram.getUserProfilePhotos(numericId, 0, 1);
                    if (photos && photos.total_count > 0 && photos.photos[0]?.length) {
                        const sizes = photos.photos[0];
                        const largestPhoto = sizes[sizes.length - 1];
                        const fileLink = await bot.telegram.getFileLink(largestPhoto.file_id);
                        avatarUrl = typeof fileLink === "string" ? fileLink : fileLink.href || String(fileLink);
                    }
                } catch {}
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
