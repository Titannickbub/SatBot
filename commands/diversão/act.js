const fs = require("fs");
const path = require("path");
const { cleanJid } = require("../../functions/moderationHelper");

const ACTIONS_FILE = path.join(__dirname, "act.json");
const ALLOWED_MEDIA_TYPES = new Set(["photo", "gif", "video"]);

module.exports = {
    name: "act",
    aliases: ["ação", "acao"],
    category: "diversão",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },
    description: "Executa uma ação interativa configurada para outro usuário.",
    usage: "{prefix}act <ação> [@membro ou mensagem respondida]",
    examples: [
        "{prefix}act kiss @membro",
        "{prefix}act hug",
        "{prefix}act slap (respondendo a uma mensagem)"
    ],
    info(message) {
        return help(message);
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

        // Se não informou ação ou pediu ajuda
        if (!actionName || actionName === "help" || actionName === "ajuda") {
            return message.reply({ text: help(message, actions) });
        }

        const action = findAction(actions, actionName);
        if (!action || action.enabled === false) {
            return message.reply({
                text: `❌ Ação *"${actionName}"* não encontrada ou desativada.\n\n${help(message, actions)}`
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
    let id = null;
    let name = null;

    // 1. Resposta à mensagem (Quote)
    if (message.quoted?.userId) {
        id = cleanJid(String(message.quoted.userId));
        name = message.quoted.displayName || message.quoted.username || message.quoted.name || null;
    }

    // 2. Menção no WhatsApp
    if (!id && message.platform === "whatsapp") {
        const mentioned = message.mentionedJids?.[0] || message.mentionedJidList?.[0];
        if (mentioned) {
            id = cleanJid(String(mentioned));
        }
    }

    // 3. Menção no Discord
    if (!id && message.platform === "discord") {
        if (message.raw?.mentions?.users?.size > 0) {
            const user = message.raw.mentions.users.first();
            id = String(user.id);
            name = user.globalName || user.displayName || user.username || null;
        }
    }

    // 4. Menção no Telegram
    if (!id && message.platform === "telegram") {
        const entities = message.raw?.message?.entities;
        if (Array.isArray(entities)) {
            const textMention = entities.find(e => e.type === "text_mention" && e.user);
            if (textMention) {
                id = String(textMention.user.id);
                name = textMention.user.first_name || textMention.user.username || null;
            }
        }
    }

    // 5. Argumento explícito (args[1])
    const rawArg = message.args?.[1]?.trim();
    if (!id && rawArg) {
        const discordMatch = rawArg.match(/^<@!?(\d+)>$/);
        if (discordMatch) {
            id = discordMatch[1];
            if (message.raw?.guild) {
                const member = message.raw.guild.members.cache.get(id);
                name = member?.displayName || member?.user?.globalName || member?.user?.username || null;
            }
        } else if (rawArg.startsWith("@") && message.platform === "telegram") {
            id = rawArg;
            name = rawArg;
        } else if (/^\d+$/.test(rawArg)) {
            id = message.platform === "whatsapp" ? `${rawArg}@s.whatsapp.net` : rawArg;
            id = cleanJid(id);
        } else if (message.platform === "whatsapp" && rawArg.replace(/\D/g, "")) {
            id = cleanJid(`${rawArg.replace(/\D/g, "")}@s.whatsapp.net`);
        }
    }

    const selfId = cleanJid(String(message.userId || ""));
    const finalId = id || selfId;
    const isSelf = !id || finalId === selfId;

    const executorName = message.displayName || message.sender?.name || message.sender?.displayName || message.sender?.username || message.username || (message.platform === "whatsapp" ? `@${selfId.split("@")[0].split(":")[0]}` : "Você");
    const targetName = isSelf ? executorName : (name || displayFallback(message, finalId));

    return {
        id: finalId,
        name: targetName,
        executorName,
        isSelf
    };
}

function displayFallback(message, id) {
    if (message.platform === "whatsapp") {
        const clean = cleanJid(String(id)).replace(/^@/, "").split("@")[0].split(":")[0];
        return `@${clean}`;
    }
    if (message.platform === "discord") {
        const clean = String(id).replace(/\D/g, "");
        return clean ? `<@${clean}>` : "usuário";
    }
    if (message.platform === "telegram") {
        if (String(id).startsWith("@")) return String(id);
        return "usuário";
    }
    return "usuário";
}

function buildWhatsAppMentions(message, target) {
    if (message.platform !== "whatsapp") return undefined;
    const ids = [message.userId, target.id]
        .filter(Boolean)
        .map(id => cleanJid(normalizeWhatsAppJid(id)));
    return [...new Set(ids)];
}

function normalizeWhatsAppJid(value) {
    const id = String(value || "").trim().replace(/^@/, "");
    return id.includes("@") ? id : `${id}@s.whatsapp.net`;
}

function renderMessage(template, message, target) {
    const isTg = message.platform === "telegram";
    const executorMention = formatMention(message, message.userId, target.executorName);
    const targetMention = formatMention(message, target.id, target.name);

    const values = {
        user1: isTg ? escapeHtml(target.executorName) : target.executorName,
        user2: isTg ? escapeHtml(target.isSelf ? target.executorName : target.name) : (target.isSelf ? target.executorName : target.name),
        user1_mention: executorMention,
        user2_mention: target.isSelf ? executorMention : targetMention,
        platform: isTg ? escapeHtml(message.platform) : message.platform
    };

    let rendered = String(template || "");
    if (isTg) {
        return rendered.replace(/\{(user1|user2|user1_mention|user2_mention|platform)\}|[^{}]+/gi, (match, key) => {
            if (key) {
                return values[key.toLowerCase()] || "";
            }
            return escapeHtml(match);
        });
    }

    return rendered.replace(/\{(user1|user2|user1_mention|user2_mention|platform)\}/gi, (_, key) => {
        return values[key.toLowerCase()] || "";
    });
}

function formatMention(message, id, name) {
    if (message.platform === "whatsapp") {
        const clean = cleanJid(String(id || "")).split("@")[0].split(":")[0];
        return `@${clean}`;
    }
    if (message.platform === "discord") {
        const cleanId = String(id || "").replace(/\D/g, "");
        return cleanId ? `<@${cleanId}>` : String(name || "usuário");
    }
    if (message.platform === "telegram") {
        const strId = String(id || "");
        if (strId.startsWith("@")) {
            return escapeHtml(strId);
        }
        if (/^\d+$/.test(strId)) {
            return `<a href="tg://user?id=${encodeURIComponent(strId)}">${escapeHtml(String(name || "usuário"))}</a>`;
        }
        return escapeHtml(String(name || id || "usuário"));
    }
    return String(name || id || "usuário");
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
        if (typeof message.replyVideo === "function") {
            return message.replyVideo({ video: resolveDiscordMedia(media.url), caption });
        }
    }
    if (typeof message.replyImg === "function") {
        return message.replyImg({ image: resolveDiscordMedia(media.url), caption });
    }

    return message.reply({ text: caption });
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

function help(message, actions = null) {
    const p = message?.prefix || "!";
    let activeActions = [];
    if (actions && typeof actions === "object") {
        activeActions = Object.keys(actions).filter(k => actions[k]?.enabled !== false);
    }
    const actionsList = activeActions.length
        ? activeActions.map(a => `\`${a}\``).join(", ")
        : "`kiss`, `hug`, `slap`, `highfive`";

    const lines = [
        "🎭 *AÇÕES INTERATIVAS (ACT)*",
        "",
        "Execute uma ação interativa com outro membro ou consigo mesmo.",
        "",
        "📋 *COMO USAR:*",
        `  • \`${p}act <ação> @membro\` — Executa a ação marcando um membro.`,
        `  • \`${p}act <ação>\` *(respondendo)* — Executa a ação respondendo à mensagem de alguém.`,
        `  • \`${p}act <ação>\` — Executa a ação sem marcação (sobre si mesmo).`,
        "",
        "✨ *AÇÕES DISPONÍVEIS:*",
        `  ${actionsList}`,
        "",
        "📌 *EXEMPLOS:*",
        `  • \`${p}act kiss @membro\``,
        `  • \`${p}act hug\``,
        `  • \`${p}act slap\` *(respondendo a uma mensagem)*`
    ];
    return lines.join("\n");
}

module.exports._internals = {
    readActions,
    findAction,
    resolveTarget,
    renderMessage,
    formatMention,
    sendMedia,
    help
};
