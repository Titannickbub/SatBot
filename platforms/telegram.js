const fs = require("fs");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", "settings", ".env")
});

const { Telegraf } = require("telegraf");
const groupSettings = require("../functions/groupSettings");
const welcomeHelper = require("../functions/welcomeHelper");
const authFlow = require("../functions/authFlow");

let bot = null;

async function start(onMessage) {
    require("dotenv").config({ path: path.join(__dirname, "..", "settings", ".env"), override: true });

    const token = authFlow.getEnvValue("TELEGRAM_TOKEN");

    if (!token) {
        console.log(
            "🔑[TELEGRAM] Token não configurado."
        );
        return;
    }

    bot = new Telegraf(token);
    global.telegramBot = bot;

    bot.on("new_chat_members", async (ctx) => {
        try {
            await welcomeHelper.handleTelegramMemberJoin(ctx);
        } catch (err) {
            console.error("❌[TELEGRAM] Erro ao processar new_chat_members para welcome:", err);
        }
    });

    bot.on("left_chat_member", async (ctx) => {
        try {
            await welcomeHelper.handleTelegramMemberLeave(ctx);
        } catch (err) {
            console.error("❌[TELEGRAM] Erro ao processar left_chat_member para goodbye:", err);
        }
    });

    bot.on("message", async (ctx) => {
        // Sincroniza configurações do chat/grupo/tópico se aplicável
        if (ctx.chat && ctx.chat.type !== "private") {
            const chatId = String(ctx.chat.id);
            if (ctx.chat.type === "channel") {
                groupSettings.loadSettings("telegram", chatId, "channel");
            } else {
                const isForum = !!ctx.chat.is_forum;
                const topicId = ctx.message && ctx.message.message_thread_id ? String(ctx.message.message_thread_id) : null;
                let topicName = null;
                if (ctx.message && ctx.message.forum_topic_created) {
                    topicName = ctx.message.forum_topic_created.name;
                } else if (ctx.message && ctx.message.forum_topic_edited) {
                    topicName = ctx.message.forum_topic_edited.name;
                }
                groupSettings.syncTelegramHierarchy(chatId, topicId, topicName, isForum, ctx.chat?.title || null);
            }
        }

        let isAdmin = false;
        let canManageMessages = false;

        if (ctx.chat.type === "private") {
            isAdmin = true;
            canManageMessages = true;
        } else {
            try {
                const member = await ctx.getChatMember(ctx.from.id);
                isAdmin = ["administrator", "creator"].includes(member.status);
                canManageMessages = member.status === "creator" || (member.status === "administrator" && member.can_delete_messages);
            } catch (err) {
                console.error("❌[TELEGRAM] Falha ao buscar permissões do membro:", err);
            }
        }

        let quoted = null;
        if (ctx.message.reply_to_message) {
            const replyTo = ctx.message.reply_to_message;

            let quotedMedia = null;
            let qFileId = null;
            let qMimeType = null;
            let qFileName = null;
            let qType = null;

            if (replyTo.photo) {
                const photo = replyTo.photo[replyTo.photo.length - 1];
                qFileId = photo.file_id;
                qMimeType = "image/jpeg";
                qType = "image";
            } else if (replyTo.sticker) {
                qFileId = replyTo.sticker.file_id;
                qMimeType = "image/webp";
                qType = "sticker";
            } else if (replyTo.video) {
                qFileId = replyTo.video.file_id;
                qMimeType = replyTo.video.mime_type || "video/mp4";
                qFileName = replyTo.video.file_name;
                qType = "video";
            } else if (replyTo.animation) {
                qFileId = replyTo.animation.file_id;
                qMimeType = replyTo.animation.mime_type || "video/mp4";
                qFileName = replyTo.animation.file_name;
                qType = "video";
            } else if (replyTo.audio) {
                qFileId = replyTo.audio.file_id;
                qMimeType = replyTo.audio.mime_type || "audio/mpeg";
                qFileName = replyTo.audio.file_name;
                qType = "audio";
            } else if (replyTo.voice) {
                qFileId = replyTo.voice.file_id;
                qMimeType = replyTo.voice.mime_type || "audio/ogg";
                qType = "audio";
            } else if (replyTo.document) {
                qFileId = replyTo.document.file_id;
                qMimeType = replyTo.document.mime_type || "application/octet-stream";
                qFileName = replyTo.document.file_name;
                qType = "document";
            }

            if (qFileId) {
                quotedMedia = {
                    fileId: qFileId,
                    mimeType: qMimeType,
                    fileName: qFileName,
                    type: qType,
                    getBuffer: async () => {
                        const { fetchBuffer } = require("../functions/api");
                        const fileLink = await bot.telegram.getFileLink(qFileId);
                        return await fetchBuffer(fileLink.href);
                    }
                };
            }

            quoted = {
                messageId: String(replyTo.message_id),
                userId: replyTo.from ? String(replyTo.from.id) : null,
                username: replyTo.from?.username || null,
                fromMe: replyTo.from ? String(replyTo.from.id) === String(ctx.botInfo.id) : false,
                isBot: replyTo.from ? !!replyTo.from.is_bot : false,
                text: replyTo.text || replyTo.caption || "",
                media: quotedMedia
            };
        }

        const rawText = ctx.message.text || ctx.message.caption || "";
        const mentionedJids = [];
        if (Array.isArray(ctx.message.entities)) {
            for (const ent of ctx.message.entities) {
                if (ent.type === "text_mention" && ent.user) {
                    mentionedJids.push(String(ent.user.id));
                } else if (ent.type === "mention") {
                    const mentionText = rawText.substring(ent.offset, ent.offset + ent.length);
                    if (mentionText) mentionedJids.push(mentionText);
                }
            }
        }

        const message = {

            platform: "telegram",

            chatId: String(ctx.chat.id),

            threadId:
                ctx.message.message_thread_id
                    ? String(
                        ctx.message.message_thread_id
                    )
                    : null,

            target: {

                chatId:
                    String(ctx.chat.id),

                threadId:
                    ctx.message.message_thread_id
                        ? String(
                            ctx.message.message_thread_id
                        )
                        : null

            },

            userId: String(ctx.from.id),

            username:
                ctx.from.username || null,

            displayName:
                ((ctx.from.first_name || "") + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "")).trim() || ctx.from.username || null,

            text: (() => {
                if (rawText) {
                    const trimmedText = rawText.trim();
                    const firstWord = trimmedText.split(/\s+/)[0].toLowerCase();
                    const botUsername = ctx.botInfo?.username ? ctx.botInfo.username.toLowerCase() : null;
                    if (firstWord === "/start" || (botUsername && firstWord === `/start@${botUsername}`)) {
                        const config = require("../functions/config").getConfig();
                        const prefix = config.prefix || "!";
                        const rest = trimmedText.substring(firstWord.length).trim();
                        return `${prefix}start${rest ? " " + rest : ""}`;
                    }
                }
                return rawText;
            })(),

            raw: ctx,

            // NOVOS CAMPOS

            messageId:
                String(ctx.message.message_id),

            createdAt:
                ctx.message.date * 1000,

            apiPing: null,

            chatType:
                ctx.chat.type,

            isPrivate:
                ctx.chat.type === "private",

            botId:
                String(ctx.botInfo.id),

            botUsername:
                ctx.botInfo.username,

            mentionedJids,

            sender: {
                isAdmin,
                canManageMessages
            },

            quoted,

            delete: async function (messageId) {
                try {
                    await ctx.deleteMessage(Number(messageId));
                    return true;
                } catch (err) {
                    console.error("❌[TELEGRAM] Falha ao deletar mensagem:", err);
                    throw err;
                }
            },

            media: (() => {
                let fileId = null;
                let mimeType = null;
                let fileName = null;
                let type = null;

                if (ctx.message.photo) {
                    const photo = ctx.message.photo[ctx.message.photo.length - 1];
                    fileId = photo.file_id;
                    mimeType = "image/jpeg";
                    type = "image";
                } else if (ctx.message.sticker) {
                    fileId = ctx.message.sticker.file_id;
                    mimeType = "image/webp";
                    type = "sticker";
                } else if (ctx.message.video) {
                    fileId = ctx.message.video.file_id;
                    mimeType = ctx.message.video.mime_type;
                    fileName = ctx.message.video.file_name;
                    type = "video";
                } else if (ctx.message.animation) {
                    fileId = ctx.message.animation.file_id;
                    mimeType = ctx.message.animation.mime_type || "video/mp4";
                    fileName = ctx.message.animation.file_name;
                    type = "video";
                } else if (ctx.message.audio) {
                    fileId = ctx.message.audio.file_id;
                    mimeType = ctx.message.audio.mime_type;
                    fileName = ctx.message.audio.file_name;
                    type = "audio";
                } else if (ctx.message.voice) {
                    fileId = ctx.message.voice.file_id;
                    mimeType = ctx.message.voice.mime_type;
                    type = "audio";
                } else if (ctx.message.document) {
                    fileId = ctx.message.document.file_id;
                    mimeType = ctx.message.document.mime_type;
                    fileName = ctx.message.document.file_name;
                    type = "document";
                }

                if (!fileId) return null;

                return {
                    fileId,
                    mimeType,
                    fileName,
                    type,
                    getBuffer: async () => {
                        const { fetchBuffer } = require("../functions/api");
                        const fileLink = await bot.telegram.getFileLink(fileId);
                        return await fetchBuffer(fileLink.href);
                    }
                };
            })(),

            reply: async function (data) {

                const options = {};

                if (this.target.threadId) {

                    options.message_thread_id =
                        Number(
                            this.target.threadId
                        );

                }

                if (typeof data === "object" && data !== null && (data.image || data.photo || data.file || data.url || data.media?.buffer || data.media?.url)) {
                    const image = data.image || data.photo || data.file || data.url || data.media?.buffer || data.media?.url;
                    return await this.replyImg({ image, caption: data.caption || data.text || "" });
                }

                await ctx.reply(
                    (typeof data === "string" ? data : data?.text) || "",
                    options
                );

            },
            react: async function (emoji, add = true) {
                try {
                    // Dicionário de conversão para o Telegram não rejeitar a reação
                    const emojiMap = {
                        "🔎": "🤔", // Lupa vira o emoji pensando
                        "📥": "⚡", // Download vira o raio
                        "⏳": "⚡", // Ampulheta vira o raio
                        "⌛": "⚡", // Ampulheta vira o raio
                        "✅": "👍", // Check vira joinha
                        "❌": "👎"  // X vira desjoinha
                    };

                    // Se o emoji enviado estiver no mapa, substitui. Se não, tenta usar o original.
                    const finalEmoji = emojiMap[emoji] || emoji;

                    await ctx.telegram.setMessageReaction(
                        ctx.chat.id,
                        ctx.message.message_id,
                        add ? [{ type: 'emoji', emoji: finalEmoji }] : []
                    );
                } catch (err) {
                    // Exibe apenas o aviso resumido no terminal sem interromper o fluxo principal
                    console.log(`❌[TELEGRAM_REACT_Bypass] Erro ao reagir: ${err.message}`);
                }
            },

            replyImg: async function (data) {
                const options = {};

                if (this.target.threadId) {
                    options.message_thread_id = Number(this.target.threadId);
                }

                if (data.caption) {
                    options.caption = data.caption;
                } else if (data.text) {
                    options.caption = data.text;
                }

                const photo = data.url || data.photo || data.image || data.file;

                if (!photo) {
                    throw new Error(
                        "❌[TELEGRAM] replyImg precisa de `url`, `photo`, `image` ou `file`."
                    );
                }

                let input = photo;

                if (Buffer.isBuffer(photo)) {
                    input = { source: photo };
                } else if (typeof photo === "string" && !/^https?:\/\//i.test(photo)) {
                    const resolvedPath = path.resolve(process.cwd(), photo);
                    if (fs.existsSync(resolvedPath)) {
                        input = { source: fs.createReadStream(resolvedPath) };
                    }
                }

                await ctx.replyWithPhoto(input, options);
            },

            replyVideo: async function (data) {
                const options = {};

                if (this.target.threadId) {
                    options.message_thread_id = Number(this.target.threadId);
                }

                if (data.caption) {
                    options.caption = data.caption;
                } else if (data.text) {
                    options.caption = data.text;
                }

                const video = data.url || data.video || data.file;

                if (!video) {
                    throw new Error(
                        "❌[TELEGRAM] replyVideo precisa de `url`, `video` ou `file`."
                    );
                }

                let input = video;

                if (Buffer.isBuffer(video)) {
                    input = { source: video };
                } else if (typeof video === "string" && !/^https?:\/\//i.test(video)) {
                    const resolvedPath = path.resolve(process.cwd(), video);
                    if (fs.existsSync(resolvedPath)) {
                        input = { source: fs.createReadStream(resolvedPath) };
                    }
                }

                await ctx.replyWithVideo(input, options);
            },

            replyAudio: async function (data) {
                const options = {};

                if (this.target.threadId) {
                    options.message_thread_id = Number(this.target.threadId);
                }

                if (data.caption) {
                    options.caption = data.caption;
                } else if (data.text) {
                    options.caption = data.text;
                }

                const audio = data.url || data.audio || data.file;

                if (!audio) {
                    throw new Error(
                        "❌[TELEGRAM] replyAudio precisa de `url`, `audio` ou `file`."
                    );
                }

                let input = audio;

                if (Buffer.isBuffer(audio)) {
                    input = { source: audio };
                } else if (typeof audio === "string" && !/^https?:\/\//i.test(audio)) {
                    const resolvedPath = path.resolve(process.cwd(), audio);
                    if (fs.existsSync(resolvedPath)) {
                        input = { source: fs.createReadStream(resolvedPath) };
                    }
                }

                await ctx.replyWithAudio(input, options);
            },

            replyFile: async function (data) {
                const options = {};

                if (this.target.threadId) {
                    options.message_thread_id = Number(this.target.threadId);
                }

                if (data.caption) {
                    options.caption = data.caption;
                } else if (data.text) {
                    options.caption = data.text;
                }

                const file = data.url || data.file || data.document;

                if (!file) {
                    throw new Error(
                        "❌[TELEGRAM] replyFile precisa de `url`, `file` ou `document`."
                    );
                }

                let input = file;

                if (Buffer.isBuffer(file)) {
                    input = { source: file, filename: data.filename || "file.bin" };
                } else if (typeof file === "string" && !/^https?:\/\//i.test(file)) {
                    const resolvedPath = path.resolve(process.cwd(), file);
                    if (fs.existsSync(resolvedPath)) {
                        input = { source: fs.createReadStream(resolvedPath) };
                    }
                }

                await ctx.replyWithDocument(input, options);
            },

            replySticker: async function (data) {
                const options = {};

                if (this.target.threadId) {
                    options.message_thread_id = Number(this.target.threadId);
                }

                let input = null;

                if (typeof data === "string") {
                    input = data;
                } else if (Buffer.isBuffer(data)) {
                    input = { source: data };
                } else if (typeof data === "object" && data !== null) {
                    const raw = data.sticker || data.file || data.buffer || data.url || data.source;
                    if (typeof raw === "string") {
                        input = raw;
                    } else if (Buffer.isBuffer(raw)) {
                        input = { source: raw };
                    }
                }

                if (!input) {
                    throw new Error(
                        "❌[TELEGRAM] replySticker precisa de um buffer WebP, string file_id/URL ou objeto `sticker`/`file`/`buffer`."
                    );
                }

                await ctx.replyWithSticker(input, options);
            }
        };
        await onMessage(message);

    });
    bot.launch().catch(err => {
        console.error("❌[TELEGRAM] Erro no bot.launch():", err);
    });

    try {
        const me = await Promise.race([
            bot.telegram.getMe(),
            new Promise(resolve => setTimeout(() => resolve(null), 3000))
        ]);

        if (me && (me.first_name || me.username)) {
            console.log(
                `🟩[TELEGRAM] Conectado como ${me.first_name || "bot"}${me.username ? ` (@${me.username})` : ""}`
            );
        } else {
            console.log("🟩[TELEGRAM] Cliente iniciado; o nome do bot não foi confirmado ainda, mas o bootstrap foi tratado como concluído.");
        }

        if (global.__pendingAuthBootstrapPlatform === "telegram") {
            global.__pendingAuthBootstrapPlatform = null;
            setTimeout(() => process.exit(0), 1000);
        }
    } catch (err) {
        console.warn("⚠️[TELEGRAM] Não foi possível confirmar o nome do bot via getMe, mas o cliente foi iniciado.", err.message || err);
        if (global.__pendingAuthBootstrapPlatform === "telegram") {
            global.__pendingAuthBootstrapPlatform = null;
            setTimeout(() => process.exit(0), 1000);
        }
        bot = null;
    }

}

// Helper function to convert Buffer to a readable stream for Telegram API
const { Readable } = require('stream');
function bufferToStream(buffer) {
    return Readable.from(buffer);
}

async function sendText(
    chatId,
    threadId,
    text
) {

    if (!bot) {
        throw new Error(
            "⛔[TELEGRAM] Cliente não iniciado."
        );
    }

    const options = {};

    if (threadId) {

        options.message_thread_id =
            Number(threadId);

    }

    const result = await bot.telegram.sendMessage(
        chatId,
        text,
        options
    );

    return String(result.message_id);

}

async function sendImg(
    chatId,
    threadId,
    image,
    caption
) {

    const options = {};

    if (threadId) {

        options.message_thread_id =
            Number(threadId);

    }

    if (caption) {

        options.caption =
            caption;

    }

    let input = image;

    const isRemoteUrl =
        typeof image === "string" &&
        /^https?:\/\//i.test(image);

    if (Buffer.isBuffer(image)) {
        // Buffer received from WhatsApp, convert to stream
        input = { source: bufferToStream(image) };
    } else if (!isRemoteUrl && typeof image === "string") {
        const resolvedPath = path.isAbsolute(image)
            ? image
            : path.join(process.cwd(), image);

        if (fs.existsSync(resolvedPath)) {
            input = {
                source: fs.createReadStream(resolvedPath)
            };
        }
    }

    const result = await bot.telegram.sendPhoto(
        chatId,
        input,
        options
    );

    return String(result.message_id);

}
async function sendVideo(
    chatId,
    threadId,
    video,
    caption
) {

    if (!bot) {
        throw new Error(
            "⛔[TELEGRAM] Cliente não iniciado."
        );
    }

    const options = {};

    if (threadId) {

        options.message_thread_id =
            Number(threadId);

    }

    if (caption) {

        options.caption =
            caption;

    }

    let input = video;

    const isRemoteUrl =
        typeof video === "string" &&
        /^https?:\/\//i.test(video);

    if (Buffer.isBuffer(video)) {
        input = { source: bufferToStream(video) };
    } else if (!isRemoteUrl && typeof video === "string") {
        const resolvedPath = path.isAbsolute(video)
            ? video
            : path.join(process.cwd(), video);

        if (fs.existsSync(resolvedPath)) {
            input = {
                source: fs.createReadStream(resolvedPath)
            };
        }
    }

    const result = await bot.telegram.sendVideo(
        chatId,
        input,
        options
    );

    return String(result.message_id);

}
async function sendAudio(
    chatId,
    threadId,
    audio,
    caption
) {
    if (!bot) {
        throw new Error(
            "⛔[TELEGRAM] Cliente não iniciado."
        );
    }

    const options = {};

    if (threadId) {
        options.message_thread_id =
            Number(threadId);
    }

    if (caption) {
        options.caption =
            caption;
    }

    let input = audio;

    const isRemoteUrl =
        typeof audio === "string" &&
        /^https?:\/\//i.test(audio);

    if (Buffer.isBuffer(audio)) {
        input = { source: bufferToStream(audio) };
    } else if (!isRemoteUrl && typeof audio === "string") {
        const resolvedPath = path.isAbsolute(audio)
            ? audio
            : path.join(process.cwd(), audio);

        if (fs.existsSync(resolvedPath)) {
            input = {
                source: fs.createReadStream(resolvedPath)
            };
        }
    }

    const result = await bot.telegram.sendAudio(
        chatId,
        input,
        options
    );

    return String(result.message_id);
}

async function sendFile(
    chatId,
    threadId,
    file,
    caption,
    filename
) {
    if (!bot) {
        throw new Error(
            "⛔[TELEGRAM] Cliente não iniciado."
        );
    }

    const options = {};

    if (threadId) {
        options.message_thread_id =
            Number(threadId);
    }

    if (caption) {
        options.caption =
            caption;
    }

    let input = file;

    const isRemoteUrl =
        typeof file === "string" &&
        /^https?:\/\//i.test(file);

    if (!isRemoteUrl && typeof file === "string") {
        const resolvedPath = path.isAbsolute(file)
            ? file
            : path.join(process.cwd(), file);

        if (fs.existsSync(resolvedPath)) {
            input = {
                source: fs.createReadStream(resolvedPath)
            };
        }
    } else if (Buffer.isBuffer(file)) {
        input = { source: file, filename: filename || "file.bin" };
    }

    const result = await bot.telegram.sendDocument(
        chatId,
        input,
        options
    );

    return String(result.message_id);
}

/**
 * Verifica se o BOT possui a permissão necessária no chat do Telegram.
 * @param {string} chatId  ID do chat
 * @param {string} action  'delete' | 'kick' | 'ban'
 * @returns {Promise<boolean>}
 */
async function checkBotPermission(chatId, action) {
    if (!bot) return false;
    try {
        const me = await bot.telegram.getChatMember(chatId, (await bot.telegram.getMe()).id);
        if (!me) return false;
        // Criador sempre tem tudo
        if (me.status === "creator") return true;
        if (me.status !== "administrator") return false;
        if (action === "delete" || action === "warn") return !!me.can_delete_messages;
        if (action === "kick" || action === "ban") return !!me.can_restrict_members;
        return false;
    } catch {
        return false;
    }
}

/**
 * Verifica se o MEMBRO é administrador ou criador do chat.
 * @param {string} chatId  ID do chat
 * @param {string} userId  ID do usuário
 * @returns {Promise<boolean>}
 */
async function checkUserPermission(chatId, userId) {
    if (!bot) return false;
    try {
        const member = await bot.telegram.getChatMember(chatId, Number(userId));
        if (!member) return false;
        return ["creator", "administrator"].includes(member.status);
    } catch {
        return false;
    }
}

module.exports = {

    name: "telegram",

    start,

    sendText,

    sendImg,

    sendVideo,

    sendAudio,

    sendFile,

    checkBotPermission,

    checkUserPermission

};