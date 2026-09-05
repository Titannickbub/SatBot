const fs = require("fs");
const path = require("path");

const ACTIONS_FILE = path.join(__dirname, "act.json");
const ALLOWED_MEDIA_TYPES = new Set(["photo", "gif", "video"]);

module.exports = {
    name: "act",
    aliases: ["ação", "acao"],
    category: "diversão",
    description: "Executa uma ação interativa configurada para outro usuário.",
    usage: "{prefix}act <ação> [@membro ou mensagem respondida]",
    examples: [
        "{prefix}act kiss @membro",
        "{prefix}act hug",
        "{prefix}act slap (respondendo a uma mensagem)"
    ],
    info(message) {
        return `🎭 Use ${message.prefix || "!"}act <ação> [@membro ou mensagem respondida].`;
    },

    async execute(message) {
        let actions;
        try {
            actions = readActions();
        } catch (error) {
            console.error("[ACT] Não foi possível ler act.json:", error);
            return message.reply({ text: "❌ O sistema de ações está temporariamente indisponível." });
        }

        const actionName = String(message.args?.[0] || "").trim().toLowerCase();
        const action = findAction(actions, actionName);
        if (!action || action.enabled === false) {
            return message.reply({
                text: actionName
                    ? `❌ Ação "${actionName}" não existe ou está desativada. Use ${message.prefix || "!"}act_edit list para consultar as ações disponíveis.`
                    : `❌ Informe uma ação. Exemplo: ${message.prefix || "!"}act kiss @membro`
            });
        }

        const target = resolveTarget(message);
        if (!Array.isArray(action.messages) || !action.messages.length) {
            return message.reply({ text: "❌ Esta ação ainda não possui frases configuradas." });
        }
        const text = renderMessage(action.messages[Math.floor(Math.random() * action.messages.length)], message, target);
        const replyOptions = {
            text,
            mentions: buildWhatsAppMentions(message, target)
        };
        if (message.platform === "telegram") {
            replyOptions.parse_mode = "HTML";
        }

        const media = Array.isArray(action.media) && action.media.length
            ? action.media[Math.floor(Math.random() * action.media.length)]
            : null;

        if (!media) {
            return message.reply(replyOptions);
        }

        try {
            return await sendMedia(message, media, text, replyOptions.mentions);
        } catch (error) {
            console.error("[ACT] Falha ao enviar mídia; usando fallback de texto:", error);
            try {
                return await message.reply(replyOptions);
            } catch (fallbackError) {
                console.error("[ACT] Falha também no fallback de texto:", fallbackError);
                return null;
            }
        }
    }
};

function readActions() {
    const parsed = JSON.parse(fs.readFileSync(ACTIONS_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("act.json precisa conter um objeto de ações.");
    }
    return parsed;
}

function findAction(actions, name) {
    if (!name) return null;
    const directKey = Object.keys(actions).find(key => key.toLowerCase() === name);
    const direct = directKey ? actions[directKey] : null;
    if (direct && typeof direct === "object") return direct;
    const aliasKey = Object.keys(actions).find(key => {
        const action = actions[key];
        return action && Array.isArray(action.aliases) &&
            action.aliases.some(alias => String(alias).toLowerCase() === name);
    });
    return aliasKey ? actions[aliasKey] : null;
}

function resolveTarget(message) {
    const mentioned = message.mentionedJidList?.[0] ||
        message.mentionedJids?.[0] ||
        null;
    const id = mentioned || message.quoted?.userId || message.userId;
    let name = message.quoted?.displayName || message.quoted?.username || null;

    if (!name && message.platform === "discord") {
        const user = message.raw?.mentions?.users?.get?.(String(id));
        name = user?.globalName || user?.displayName || user?.username || null;
    }
    if (!name && message.platform === "telegram" && String(id).startsWith("@")) {
        name = String(id);
    }

    const executorName = message.displayName || message.username || String(message.userId);
    const targetName = name || (String(id) === String(message.userId)
        ? executorName
        : displayFallback(message, id));
    return {
        id: String(id || message.userId),
        name: targetName,
        executorName,
        isSelf: String(id || "") === String(message.userId || "")
    };
}

function displayFallback(message, id) {
    if (message.platform === "whatsapp") {
        return `@${String(id).replace(/^@/, "").split("@")[0]}`;
    }
    if (message.platform === "discord") {
        return `<@${String(id)}>`;
    }
    return "usuário";
}

function buildWhatsAppMentions(message, target) {
    if (message.platform !== "whatsapp") return undefined;
    const ids = [message.userId, target.id]
        .filter(Boolean)
        .map(normalizeWhatsAppJid);
    return [...new Set(ids)];
}

function normalizeWhatsAppJid(value) {
    const id = String(value || "").trim().replace(/^@/, "");
    return id.includes("@") ? id : `${id}@s.whatsapp.net`;
}

function renderMessage(template, message, target) {
    const executorMention = formatMention(message, message.userId, target.executorName);
    const targetMention = formatMention(message, target.id, target.name);
    const values = {
        user1: target.executorName,
        user2: target.isSelf ? target.executorName : target.name,
        user1_mention: executorMention,
        user2_mention: target.isSelf ? executorMention : targetMention,
        platform: message.platform
    };
    if (message.platform === "telegram") {
        values.user1 = escapeHtml(values.user1);
        values.user2 = escapeHtml(values.user2);
        values.platform = escapeHtml(values.platform);
    }
    let rendered = String(template || "");
    if (message.platform === "telegram") rendered = escapeHtml(rendered);
    return rendered.replace(/\{(user1|user2|user1_mention|user2_mention|platform)\}/gi, (_, key) => {
        return values[key.toLowerCase()] || "";
    });
}

function formatMention(message, id, name) {
    if (message.platform === "whatsapp") {
        return `@${normalizeWhatsAppJid(id).split("@")[0].split(":")[0]}`;
    }
    if (message.platform === "discord") {
        return `<@${String(id)}>`;
    }
    if (/^\d+$/.test(String(id))) {
        return `<a href="tg://user?id=${encodeURIComponent(String(id))}">${escapeHtml(String(name || "usuário"))}</a>`;
    }
    return escapeHtml(String(name || id || "usuário"));
}

async function sendMedia(message, media, caption, mentions) {
    const type = String(media.type || "photo").toLowerCase();
    if (!ALLOWED_MEDIA_TYPES.has(type) || !media.url) {
        throw new Error("Mídia de ação inválida.");
    }

    if (message.platform === "whatsapp") {
        const sock = global.whatsappSock;
        if (!sock) throw new Error("Socket do WhatsApp não está disponível.");
        const input = resolveWhatsAppMedia(media.url);
        const payload = {
            caption,
            mentions: mentions || []
        };
        if (type === "video" || type === "gif") {
            payload.video = input;
            if (type === "gif") payload.gifPlayback = true;
        } else {
            payload.image = input;
        }
        return sock.sendMessage(message.chatId, payload, { quoted: message.raw });
    }

    if (message.platform === "telegram") {
        const ctx = message.raw;
        if (!ctx?.telegram) throw new Error("Contexto do Telegram não está disponível.");
        let input = resolveTelegramMedia(media.url);
        const extra = {
            caption,
            parse_mode: "HTML"
        };
        if (message.threadId) extra.message_thread_id = Number(message.threadId);
        const sendFn = type === "video"
            ? ctx.telegram.sendVideo.bind(ctx.telegram)
            : type === "gif"
                ? ctx.telegram.sendAnimation.bind(ctx.telegram)
                : ctx.telegram.sendPhoto.bind(ctx.telegram);
        try {
            return await sendFn(message.chatId, input, extra);
        } catch (error) {
            if (!/can't parse entities|parse entities/i.test(error?.message || error?.description || "")) {
                throw error;
            }
            delete extra.parse_mode;
            return sendFn(message.chatId, input, extra);
        }
    }

    if (type === "video") {
        return message.replyVideo({ video: resolveDiscordMedia(media.url), caption });
    }
    return message.replyImg({ image: resolveDiscordMedia(media.url), caption });
}

function resolveWhatsAppMedia(value) {
    if (typeof value !== "string") return value;
    if (/^https?:\/\//i.test(value)) return { url: value };
    const resolved = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
    return fs.existsSync(resolved) ? fs.readFileSync(resolved) : value;
}

function resolveDiscordMedia(value) {
    if (typeof value !== "string") return value;
    const resolved = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
    return fs.existsSync(resolved) ? resolved : value;
}

function resolveTelegramMedia(value) {
    if (typeof value !== "string") return value;
    if (/^https?:\/\//i.test(value)) return value;
    const resolved = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
    return fs.existsSync(resolved) ? { source: fs.createReadStream(resolved) } : value;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

module.exports._internals = {
    readActions,
    findAction,
    resolveTarget,
    renderMessage,
    formatMention,
    sendMedia
};
