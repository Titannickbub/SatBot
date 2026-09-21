const fs = require("fs");
const os = require("os");
const path = require("path");
const { cleanJid } = require("../../functions/moderationHelper");
const { fetchBuffer } = require("../../functions/api");

let ffmpegPath;
try {
    ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
} catch {
    ffmpegPath = "ffmpeg";
}

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
    usage: [
        "{prefix}act kiss",
        "{prefix}act hug",
        "{prefix}act slap",
        "{prefix}act highfive"
    ].join("\n"),
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

function detectBufferFormat(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
        return { ext: "bin", mime: "application/octet-stream", type: "unknown" };
    }
    const header3 = buffer.slice(0, 3).toString("ascii");
    const header6 = buffer.slice(0, 6).toString("ascii");
    if (header3 === "GIF" || header6.startsWith("GIF8")) {
        return { ext: "gif", mime: "image/gif", type: "gif", isRealGif: true };
    }
    const ftyp = buffer.slice(4, 8).toString("ascii");
    if (ftyp === "ftyp" || ftyp === "moov" || buffer.slice(4, 12).toString("ascii").includes("mp4")) {
        return { ext: "mp4", mime: "video/mp4", type: "video", isMp4: true };
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return { ext: "png", mime: "image/png", type: "photo" };
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return { ext: "jpg", mime: "image/jpeg", type: "photo" };
    }
    if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") {
        return { ext: "webp", mime: "image/webp", type: "photo" };
    }
    return { ext: "bin", mime: "application/octet-stream", type: "unknown" };
}

const MEDIA_DIR = path.join(__dirname, "act_media");

async function resolveMediaBuffer(media) {
    if (!media) throw new Error("Mídia não especificada.");

    // 1. Arquivo salvo na pasta do comando (act_media/)
    if (typeof media.file === "string" && media.file.trim()) {
        const candidatePaths = [
            path.join(MEDIA_DIR, path.basename(media.file)),
            path.resolve(__dirname, media.file),
            path.join(MEDIA_DIR, media.file)
        ];
        for (const candidate of candidatePaths) {
            if (fs.existsSync(candidate)) {
                return fs.readFileSync(candidate);
            }
        }
    }

    // 2. Buffer direto em base64 no JSON (legado/fallback)
    if (media.base64 && typeof media.base64 === "string") {
        return Buffer.from(media.base64, "base64");
    }
    if (media.data && typeof media.data === "string") {
        const b64 = media.data.includes(",") ? media.data.split(",")[1] : media.data;
        return Buffer.from(b64, "base64");
    }

    // 3. Data URI no campo url
    if (typeof media.url === "string" && media.url.startsWith("data:")) {
        const b64 = media.url.split(",")[1];
        return Buffer.from(b64, "base64");
    }

    // 4. URL externa HTTP/HTTPS
    if (typeof media.url === "string" && /^https?:\/\//i.test(media.url)) {
        return await fetchBuffer(media.url);
    }

    // 5. Arquivo local no disco
    if (typeof media.url === "string") {
        const candidatePaths = [
            path.join(MEDIA_DIR, path.basename(media.url)),
            path.resolve(__dirname, media.url),
            path.isAbsolute(media.url) ? media.url : path.resolve(process.cwd(), media.url)
        ];
        for (const candidate of candidatePaths) {
            if (fs.existsSync(candidate)) {
                return fs.readFileSync(candidate);
            }
        }
    }

    throw new Error("Não foi possível carregar o buffer da mídia da ação.");
}

/**
 * Converte um buffer GIF clássico (image/gif) para MP4 (H.264) usando ffmpeg.
 * Necessário porque o WhatsApp não suporta GIFs clássicas — só aceita MP4 com gifPlayback.
 */
function convertGifToMp4(gifBuffer) {
    return new Promise((resolve, reject) => {
        const { execFile } = require("child_process");
        const tmpDir = os.tmpdir();
        const id = `act_gif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const inputPath = path.join(tmpDir, `${id}.gif`);
        const outputPath = path.join(tmpDir, `${id}.mp4`);

        fs.writeFileSync(inputPath, gifBuffer);

        const args = [
            "-y",                        // Sobrescreve sem perguntar
            "-i", inputPath,             // Input GIF
            "-movflags", "faststart",    // Metadados no início (streaming)
            "-pix_fmt", "yuv420p",       // Formato de pixel compatível
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", // Dimensões pares (requisito H.264)
            "-loop", "0",                // Loop infinito
            "-an",                       // Sem áudio
            outputPath
        ];

        execFile(ffmpegPath, args, { timeout: 30000 }, (error) => {
            // Limpa input independente do resultado
            try { fs.unlinkSync(inputPath); } catch {}

            if (error) {
                try { fs.unlinkSync(outputPath); } catch {}
                return reject(new Error(`ffmpeg falhou: ${error.message}`));
            }

            try {
                const mp4Buffer = fs.readFileSync(outputPath);
                fs.unlinkSync(outputPath);
                if (!mp4Buffer || mp4Buffer.length < 100) {
                    return reject(new Error("ffmpeg gerou um MP4 vazio ou inválido."));
                }
                resolve(mp4Buffer);
            } catch (readErr) {
                return reject(new Error(`Erro ao ler MP4 convertido: ${readErr.message}`));
            }
        });
    });
}

function convertMp4ToGif(mp4Buffer) {
    return new Promise((resolve, reject) => {
        const { execFile } = require("child_process");
        const tmpDir = os.tmpdir();
        const id = `act_mp4_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const inputPath = path.join(tmpDir, `${id}.mp4`);
        const outputPath = path.join(tmpDir, `${id}.gif`);

        fs.writeFileSync(inputPath, mp4Buffer);

        const args = [
            "-y",
            "-i", inputPath,
            "-filter_complex",
            "[0:v]fps=15,scale=trunc(min(480\\,iw)/2)*2:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=sierra2_4a",
            "-loop", "0",
            outputPath
        ];

        execFile(ffmpegPath, args, { timeout: 30000 }, (error) => {
            try { fs.unlinkSync(inputPath); } catch {}

            if (error) {
                try { fs.unlinkSync(outputPath); } catch {}
                return reject(new Error(`ffmpeg falhou ao gerar GIF: ${error.message}`));
            }

            try {
                const gifBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(outputPath);
                if (!gifBuffer || gifBuffer.length < 100) {
                    return reject(new Error("ffmpeg gerou um GIF vazio ou inválido."));
                }
                resolve(gifBuffer);
            } catch (readErr) {
                return reject(new Error(`Erro ao ler GIF convertido: ${readErr.message}`));
            }
        });
    });
}

async function sendMedia(message, media, caption, mentions) {
    const type = String(media.type || "photo").toLowerCase();
    if (!ALLOWED_MEDIA_TYPES.has(type)) {
        throw new Error("Mídia de ação inválida.");
    }

    let buffer = await resolveMediaBuffer(media);
    const detected = detectBufferFormat(buffer);
    let fileName = media.fileName || `action.${detected.ext !== "bin" ? detected.ext : (type === "gif" ? "gif" : "png")}`;

    // Log do formato real da mídia
    if (type === "gif" || detected.isRealGif || detected.isMp4) {
        const gifKind = detected.isRealGif ? "GIF clássica (image/gif)" : detected.isMp4 ? "MP4 (video/mp4)" : `outro (${detected.mime})`;
        console.log(`[ACT] Mídia enviada como GIF → formato real: ${gifKind} | ext: ${detected.ext} | mime: ${detected.mime} | tamanho: ${(buffer.length / 1024).toFixed(1)} KB`);
    }

    if (message.platform === "whatsapp") {
        const sock = global.whatsappSock;
        if (!sock) throw new Error("Socket do WhatsApp não está disponível.");

        const payload = {
            caption,
            mentions: mentions || []
        };

        if (type === "gif" || detected.isRealGif || type === "video" || detected.isMp4) {
            // WhatsApp não suporta GIF clássica (image/gif) — precisa de MP4
            if (detected.isRealGif) {
                console.log("[ACT] Convertendo GIF clássica → MP4 para compatibilidade com WhatsApp...");
                try {
                    buffer = await convertGifToMp4(buffer);
                    console.log(`[ACT] Conversão concluída! Novo tamanho: ${(buffer.length / 1024).toFixed(1)} KB`);
                } catch (convErr) {
                    console.error("[ACT] Falha na conversão GIF → MP4:", convErr.message || convErr);
                    // Tenta enviar mesmo assim como fallback
                }
            }
            payload.video = buffer;
            payload.gifPlayback = true;
        } else {
            // Imagem estática (PNG/JPEG/WebP)
            payload.image = buffer;
        }

        return await sock.sendMessage(message.chatId, payload, { quoted: message.raw });
    }

    if (message.platform === "telegram") {
        const ctx = message.raw;
        if (!ctx?.telegram) throw new Error("Contexto do Telegram não está disponível.");
        const extra = {
            caption,
            parse_mode: "HTML"
        };
        if (message.threadId) extra.message_thread_id = Number(message.threadId);

        const sourceObj = { source: buffer, filename: fileName };
        let sendFn;

        if (type === "gif" || detected.isRealGif || type === "video" || detected.isMp4) {
            sendFn = ctx.telegram.sendAnimation.bind(ctx.telegram);
        } else {
            sendFn = ctx.telegram.sendPhoto.bind(ctx.telegram);
        }

        try {
            return await sendFn(message.chatId, sourceObj, extra);
        } catch (error) {
            if (!/can't parse entities|parse entities/i.test(error?.message || error?.description || "")) {
                throw error;
            }
            delete extra.parse_mode;
            return sendFn(message.chatId, sourceObj, extra);
        }
    }

    if (message.platform === "discord") {
        if (typeof message.replyImg === "function") {
            return message.replyImg({ image: buffer, caption, fileName });
        }
        if (typeof message.replyVideo === "function") {
            return message.replyVideo({ video: buffer, caption, fileName });
        }
    }

    if ((type === "video" || detected.isMp4 || type === "gif" || detected.isRealGif) && typeof message.replyVideo === "function") {
        return message.replyVideo({ video: buffer, caption, fileName });
    }
    if (typeof message.replyImg === "function") {
        return message.replyImg({ image: buffer, caption, fileName });
    }

    return message.reply({ text: caption });
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
        ? activeActions.map(a => `  • \`${p}act ${a}\``).join("\n")
        : ["kiss", "hug", "slap", "highfive"]
            .map(a => `  • \`${p}act ${a}\``)
            .join("\n");

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
        actionsList
    ];
    return lines.join("\n");
}

module.exports._internals = {
    readActions,
    findAction,
    resolveTarget,
    renderMessage,
    formatMention,
    resolveMediaBuffer,
    detectBufferFormat,
    convertGifToMp4,
    convertMp4ToGif,
    sendMedia,
    help
};
