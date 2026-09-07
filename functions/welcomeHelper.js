const path = require("path");
const fs = require("fs");
const { loadSettings, saveSettings } = require("./groupSettings");
const config = require("./config");

const axios = require("axios");

const LOCAL_UPLOADS_DIR = path.join(__dirname, "..", "settings", "uploads");
const MEDIA_UPLOAD_DIR = path.join(LOCAL_UPLOADS_DIR, "media");

function ensureUploadDir() {
    if (!fs.existsSync(MEDIA_UPLOAD_DIR)) {
        fs.mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
    }
}

function getFileExtension(fileName, mimeType) {
    const lowerFile = String(fileName || "").toLowerCase();
    if (lowerFile.endsWith(".mp4")) return ".mp4";
    if (lowerFile.endsWith(".gif")) return ".gif";
    if (lowerFile.endsWith(".webp")) return ".webp";
    if (lowerFile.endsWith(".jpg") || lowerFile.endsWith(".jpeg")) return ".jpg";
    if (lowerFile.endsWith(".png")) return ".png";
    if (mimeType && mimeType.toLowerCase().includes("gif")) return ".gif";
    if (mimeType && mimeType.toLowerCase().includes("mp4")) return ".mp4";
    if (mimeType && mimeType.toLowerCase().includes("webp")) return ".webp";
    if (mimeType && mimeType.toLowerCase().includes("jpeg")) return ".jpg";
    if (mimeType && mimeType.toLowerCase().includes("jpg")) return ".jpg";
    if (mimeType && mimeType.toLowerCase().includes("png")) return ".png";
    return ".bin";
}

function normalizeMediaType(mimeType, fileName) {
    const lowerMime = String(mimeType || "").toLowerCase();
    const ext = getFileExtension(fileName, mimeType);
    if (lowerMime.includes("gif") || ext === ".gif") return "gif";
    if (lowerMime.includes("video") || ext === ".mp4") return "video";
    return "photo";
}

async function saveMediaLocally(buffer, fileName = "media", mimeType = "") {
    ensureUploadDir();
    const ext = getFileExtension(fileName, mimeType) || ".jpg";
    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}${ext}`;
    const filePath = path.join(MEDIA_UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

/**
 * Baixa uma mídia a partir de uma URL web e a salva localmente no disco.
 * @param {string} url URL da mídia
 * @param {string} [defaultFileName="media"] Nome base do arquivo
 * @returns {Promise<{url: string, type: string, fileName: string, size: number, storageProvider: string}>}
 */
async function downloadAndSaveMediaLocally(url, defaultFileName = "media") {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers["content-type"] || "";
    let fileName = defaultFileName;
    const urlPath = url.split(/[#?]/)[0];
    const detected = urlPath.split("/").pop();
    if (detected && /\.[a-z0-9]+$/i.test(detected)) {
        fileName = detected;
    }

    const localPath = await saveMediaLocally(buffer, fileName, contentType);
    const mediaType = normalizeMediaType(contentType, fileName);

    return {
        url: localPath,
        type: mediaType,
        fileName: path.basename(localPath),
        size: buffer.length,
        storageProvider: "local"
    };
}

/**
 * Armazena uma mídia enviada diretamente no disco local permanente do bot.
 * @param {string} platform Plataforma do emissor
 * @param {object} message Objeto de mensagem
 * @param {Buffer} buffer Buffer da mídia
 * @param {string} fileName Nome sugerido
 * @param {string} mimeType MIME type da mídia
 * @returns {Promise<{url: string, type: string, fileName: string, size: number, storageProvider: string}>}
 */
async function storeMedia(platform, message, buffer, fileName = "welcome_media", mimeType = "image/png") {
    const localPath = await saveMediaLocally(buffer, fileName, mimeType);
    return {
        url: localPath,
        type: normalizeMediaType(mimeType, fileName),
        fileName: path.basename(localPath),
        size: buffer.length,
        storageProvider: "local"
    };
}

/**
 * Formata o texto de boas-vindas/despedida substituindo variáveis dinâmicas.
 * Variáveis: {user}, {mention}, {group}, {server}, {count}, {members}
 */
function formatWelcomeText(template, vars = {}) {
    if (!template) return "Seja bem-vindo(a)!";
    const user = vars.user || "Membro";
    const group = vars.group || vars.server || "nosso servidor/grupo";
    const count = vars.count !== undefined && vars.count !== null ? String(vars.count) : "";

    return template
        .replace(/\{user\}/gi, user)
        .replace(/\{mention\}/gi, user)
        .replace(/\{group\}/gi, group)
        .replace(/\{server\}/gi, group)
        .replace(/\{count\}/gi, count)
        .replace(/\{members\}/gi, count);
}

/**
 * Retorna a configuração padrão de welcome.
 */
function getDefaultWelcomeConfig() {
    return {
        enabled: false,
        mode: "texto",
        text: "Olá {user}, seja bem-vindo(a) ao grupo {group}!",
        media: null
    };
}

/**
 * Retorna a configuração padrão de goodbye.
 */
function getDefaultGoodbyeConfig() {
    return {
        enabled: false,
        mode: "texto",
        text: "Até logo, {user}! Sentiremos sua falta no {group}.",
        media: null
    };
}

// ─────────────────────────────────────────────────────────────
//  LEITURA DE CONFIGURAÇÃO — WELCOME & GOODBYE
// ─────────────────────────────────────────────────────────────

function _findDiscordNode(serverId, chatId, threadId, key) {
    const data = loadSettings("discord", serverId, "server");
    let foundNode = null;

    const findInChats = (chats) => {
        if (!Array.isArray(chats)) return;
        for (const ch of chats) {
            if (threadId) {
                if (Array.isArray(ch.topico)) {
                    const top = ch.topico.find(t => String(t.id) === String(threadId));
                    if (top) { foundNode = top; return; }
                }
            }
            if (String(ch.id) === String(chatId)) { foundNode = ch; return; }
        }
    };

    if (Array.isArray(data.categoria)) {
        for (const cat of data.categoria) {
            findInChats(cat.chat);
            if (foundNode) break;
        }
    }
    if (!foundNode) findInChats(data.chat);

    const defaults = key === "goodbye" ? getDefaultGoodbyeConfig() : getDefaultWelcomeConfig();
    const config = foundNode?.settings?.[key]
        ? { ...defaults, ...foundNode.settings[key] }
        : defaults;
    return { config, foundNode, data };
}

/**
 * Obtém a configuração de welcome para o contexto específico.
 */
function getWelcomeConfig(platform, serverId, chatId, threadId) {
    return _getConfig(platform, serverId, chatId, threadId, "welcome");
}

/**
 * Obtém a configuração de goodbye para o contexto específico.
 */
function getGoodbyeConfig(platform, serverId, chatId, threadId) {
    return _getConfig(platform, serverId, chatId, threadId, "goodbye");
}

function _getConfig(platform, serverId, chatId, threadId, key) {
    const defaults = key === "goodbye" ? getDefaultGoodbyeConfig() : getDefaultWelcomeConfig();

    if (platform === "discord") {
        if (!serverId) return { config: defaults, pathInfo: null };
        return _findDiscordNode(serverId, chatId, threadId, key);
    }

    if (platform === "telegram") {
        const data = loadSettings("telegram", chatId, "group");
        let obj = null;
        if (threadId && Array.isArray(data.topico)) {
            const top = data.topico.find(t => String(t.id) === String(threadId));
            if (top?.settings) obj = top.settings[key];
        }
        if (!obj) obj = data.settings?.[key];
        const config = obj ? { ...defaults, ...obj } : defaults;
        return { config, data };
    }

    if (platform === "whatsapp") {
        const data = loadSettings("whatsapp", chatId, "group");
        const obj = data.settings?.[key];
        const config = obj ? { ...defaults, ...obj } : defaults;
        return { config, data };
    }

    return { config: defaults, data: null };
}

// ─────────────────────────────────────────────────────────────
//  SALVAMENTO DE CONFIGURAÇÃO — WELCOME & GOODBYE
// ─────────────────────────────────────────────────────────────

/**
 * Salva a configuração de welcome.
 */
function saveWelcomeConfig(platform, serverId, chatId, threadId, newConfig) {
    return _saveConfig(platform, serverId, chatId, threadId, newConfig, "welcome");
}

/**
 * Salva a configuração de goodbye.
 */
function saveGoodbyeConfig(platform, serverId, chatId, threadId, newConfig) {
    return _saveConfig(platform, serverId, chatId, threadId, newConfig, "goodbye");
}

function _saveConfig(platform, serverId, chatId, threadId, newConfig, key) {
    const defaults = key === "goodbye" ? getDefaultGoodbyeConfig() : getDefaultWelcomeConfig();

    if (platform === "discord") {
        if (!serverId) throw new Error("ID do servidor não especificado.");
        const data = loadSettings("discord", serverId, "server");

        // Regra de canal único: ao ativar, desativa nos outros canais do servidor
        if (newConfig.enabled) {
            const disableAll = (chats) => {
                if (!Array.isArray(chats)) return;
                for (const ch of chats) {
                    if (ch.settings?.[key]) ch.settings[key].enabled = false;
                    if (Array.isArray(ch.topico)) {
                        for (const top of ch.topico) {
                            if (top.settings?.[key]) top.settings[key].enabled = false;
                        }
                    }
                }
            };
            if (Array.isArray(data.categoria)) {
                for (const cat of data.categoria) disableAll(cat.chat);
            }
            disableAll(data.chat);
        }

        let targetNode = null;
        const locate = (chats) => {
            if (!Array.isArray(chats)) return false;
            for (const ch of chats) {
                if (threadId) {
                    if (Array.isArray(ch.topico)) {
                        const top = ch.topico.find(t => String(t.id) === String(threadId));
                        if (top) { targetNode = top; return true; }
                    }
                } else if (String(ch.id) === String(chatId)) {
                    targetNode = ch; return true;
                }
            }
            return false;
        };

        let found = false;
        if (Array.isArray(data.categoria)) {
            for (const cat of data.categoria) {
                if (locate(cat.chat)) { found = true; break; }
            }
        }
        if (!found) locate(data.chat);

        if (targetNode) {
            targetNode.settings = targetNode.settings || {};
            targetNode.settings[key] = { ...defaults, ...(targetNode.settings[key] || {}), ...newConfig };
        } else {
            const newChatObj = {
                id: chatId,
                name: `chat-${chatId}`,
                topico: threadId ? [{ id: threadId, name: `thread-${threadId}`, settings: { [key]: newConfig } }] : [],
                settings: threadId ? {} : { [key]: newConfig }
            };
            data.chat = data.chat || [];
            data.chat.push(newChatObj);
        }

        saveSettings("discord", serverId, "server", data, { raw: { guild: { id: serverId, name: serverId } } });
        return true;
    }

    if (platform === "telegram") {
        const data = loadSettings("telegram", chatId, "group");
        if (threadId && Array.isArray(data.topico)) {
            let top = data.topico.find(t => String(t.id) === String(threadId));
            if (!top) {
                top = { id: String(threadId), name: `Tópico ${threadId}`, settings: {} };
                data.topico.push(top);
            }
            top.settings = top.settings || {};
            top.settings[key] = { ...defaults, ...(top.settings[key] || {}), ...newConfig };
        } else {
            data.settings = data.settings || {};
            data.settings[key] = { ...defaults, ...(data.settings[key] || {}), ...newConfig };
        }
        saveSettings("telegram", chatId, "group", data, { raw: { chat: { id: chatId, title: chatId } } });
        return true;
    }

    if (platform === "whatsapp") {
        if (!chatId || !chatId.endsWith("@g.us")) {
            throw new Error("O sistema de boas-vindas/despedida no WhatsApp só é permitido em grupos.");
        }
        const data = loadSettings("whatsapp", chatId, "group");
        data.settings = data.settings || {};
        data.settings[key] = { ...defaults, ...(data.settings[key] || {}), ...newConfig };
        saveSettings("whatsapp", chatId, "group", data, { raw: { chat: { id: chatId, title: chatId } } });
        return true;
    }

    return false;
}

// ─────────────────────────────────────────────────────────────
//  HELPER DE ENVIO DE MÍDIA (reutilizável)
// ─────────────────────────────────────────────────────────────

async function _sendDiscordMsg(channel, config, text) {
    if (config.mode === "media" && config.media?.url) {
        let mediaUrl = config.media.url;
        let isLocalPath = typeof mediaUrl === "string" &&
            !mediaUrl.startsWith("http://") &&
            !mediaUrl.startsWith("https://") &&
            fs.existsSync(mediaUrl);

        // Se for URL externa, tenta baixar localmente para armazenamento permanente
        if (!isLocalPath && typeof mediaUrl === "string" && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://"))) {
            try {
                const saved = await downloadAndSaveMediaLocally(mediaUrl, config.media.fileName || "welcome_media");
                config.media.url = saved.url;
                mediaUrl = saved.url;
                isLocalPath = true;
            } catch (err) {
                console.warn("[welcomeHelper] Mídia Discord expirada ou inacessível:", err.message);
                return channel.send({
                    content: `${text}\n\n⚠️ *(Aviso aos administradores: A imagem de boas-vindas/despedida expirou por ter sido definida como link antigo. Reenvie a imagem diretamente no comando para salvá-la permanentemente no bot).*`
                });
            }
        }

        if (isLocalPath) {
            const fileName = config.media.fileName || path.basename(mediaUrl) || "welcome_media.jpg";
            const attachment = {
                attachment: fs.readFileSync(mediaUrl),
                name: fileName
            };
            return channel.send({ content: text, files: [attachment] });
        }
    }
    return channel.send({ content: text });
}

function isTelegramMarkdownParseError(error) {
    const description = error?.response?.description || error?.description || error?.message || "";
    return /can't parse entities|parse entities/i.test(description);
}

async function _sendTelegramWithFallback(sendFn, chatId, payload, extra) {
    try {
        return await sendFn(chatId, payload, extra);
    } catch (error) {
        if (!isTelegramMarkdownParseError(error)) {
            throw error;
        }

        const fallbackExtra = { ...extra };
        delete fallbackExtra.parse_mode;
        return await sendFn(chatId, payload, fallbackExtra);
    }
}

async function _sendTelegramMsg(ctx, chatId, config, text, threadId) {
    const extra = { parse_mode: "Markdown" };
    if (threadId) extra.message_thread_id = Number(threadId);

    if (config.mode === "media" && config.media?.url) {
        const mediaType = config.media.type || "photo";
        let mediaInput = config.media.url;
        let isLocal = typeof mediaInput === "string" && fs.existsSync(mediaInput);

        // Se for URL externa, tenta baixar localmente
        if (!isLocal && typeof mediaInput === "string" && (mediaInput.startsWith("http://") || mediaInput.startsWith("https://"))) {
            try {
                const saved = await downloadAndSaveMediaLocally(mediaInput, config.media.fileName || "welcome_media");
                config.media.url = saved.url;
                mediaInput = saved.url;
                isLocal = true;
            } catch (err) {
                console.warn("[welcomeHelper] Mídia Telegram expirada/inacessível:", err.message);
                return _sendTelegramWithFallback(
                    ctx.telegram.sendMessage.bind(ctx.telegram),
                    chatId,
                    `${text}\n\n⚠️ _(Aviso: A mídia de boas-vindas/despedida expirou. Reconfigure com uma nova imagem/vídeo)._`,
                    extra
                );
            }
        }

        if (isLocal) {
            mediaInput = { source: fs.createReadStream(mediaInput) };
        }

        if (mediaType === "video") {
            await _sendTelegramWithFallback(ctx.telegram.sendVideo.bind(ctx.telegram), chatId, mediaInput, { caption: text, ...extra });
        } else if (mediaType === "gif") {
            await _sendTelegramWithFallback(ctx.telegram.sendAnimation.bind(ctx.telegram), chatId, mediaInput, { caption: text, ...extra });
        } else {
            await _sendTelegramWithFallback(ctx.telegram.sendPhoto.bind(ctx.telegram), chatId, mediaInput, { caption: text, ...extra });
        }
    } else {
        await _sendTelegramWithFallback(ctx.telegram.sendMessage.bind(ctx.telegram), chatId, text, extra);
    }
}

async function _sendWhatsAppMsg(sock, groupId, config, text, participantJid) {
    if (config.mode === "media" && config.media?.url) {
        const mediaType = config.media.type || "photo";
        let mediaUrl = config.media.url;
        let isLocalFile = typeof mediaUrl === "string" && fs.existsSync(mediaUrl);

        if (!isLocalFile && typeof mediaUrl === "string" && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://"))) {
            try {
                const saved = await downloadAndSaveMediaLocally(mediaUrl, config.media.fileName || "welcome_media");
                config.media.url = saved.url;
                mediaUrl = saved.url;
                isLocalFile = true;
            } catch (err) {
                console.warn("[welcomeHelper] Mídia WhatsApp expirada/inacessível:", err.message);
                return sock.sendMessage(groupId, {
                    text: `${text}\n\n⚠️ *(Aviso: A mídia de boas-vindas/despedida expirou. Reconfigure enviando a imagem diretamente).*`,
                    mentions: [participantJid]
                });
            }
        }

        const payload = { caption: text, mentions: [participantJid] };

        if (mediaType === "video") {
            if (isLocalFile) {
                payload.video = fs.readFileSync(mediaUrl);
            } else {
                payload.video = { url: mediaUrl };
            }
        } else {
            if (isLocalFile) {
                payload.image = fs.readFileSync(mediaUrl);
            } else {
                payload.image = { url: mediaUrl };
            }
        }

        await sock.sendMessage(groupId, payload);
    } else {
        await sock.sendMessage(groupId, { text, mentions: [participantJid] });
    }
}

// ─────────────────────────────────────────────────────────────
//  DISCORD — JOIN / LEAVE
// ─────────────────────────────────────────────────────────────

async function handleDiscordMemberJoin(member) {
    try {
        if (!member || !member.guild) return;
        const guildId = String(member.guild.id);
        const tag = member.user?.tag || member.user?.username || member.id;
        console.log(`📥[discord] ${tag} (${member.id}) entrou no servidor ${member.guild.name} (${guildId})`);

        const data = loadSettings("discord", guildId, "server");
        let activeChannelId = null;
        let activeConfig = null;

        const checkChats = (chats) => {
            if (!Array.isArray(chats)) return;
            for (const ch of chats) {
                if (ch.settings?.welcome?.enabled) { activeChannelId = String(ch.id); activeConfig = ch.settings.welcome; return; }
                if (Array.isArray(ch.topico)) {
                    for (const top of ch.topico) {
                        if (top.settings?.welcome?.enabled) { activeChannelId = String(top.id); activeConfig = top.settings.welcome; return; }
                    }
                }
            }
        };

        if (Array.isArray(data.categoria)) {
            for (const cat of data.categoria) { checkChats(cat.chat); if (activeChannelId) break; }
        }
        if (!activeChannelId) checkChats(data.chat);
        if (!activeChannelId || !activeConfig) return;

        const channel = member.guild.channels.cache.get(activeChannelId) ||
            await member.guild.channels.fetch(activeChannelId).catch(() => null);
        if (!channel) return;

        const text = formatWelcomeText(activeConfig.text, {
            user: `<@${member.id}>`,
            group: member.guild.name,
            count: member.guild.memberCount
        });

        await _sendDiscordMsg(channel, activeConfig, text);
    } catch (err) {
        console.error("[welcomeHelper] Erro ao enviar boas-vindas no Discord:", err);
    }
}

async function handleDiscordMemberLeave(member) {
    try {
        if (!member || !member.guild) return;
        const guildId = String(member.guild.id);
        const tag = member.user?.tag || member.user?.username || member.id;
        console.log(`📤[discord] ${tag} (${member.id}) saiu do servidor ${member.guild.name} (${guildId})`);

        const data = loadSettings("discord", guildId, "server");
        let activeChannelId = null;
        let activeConfig = null;

        const checkChats = (chats) => {
            if (!Array.isArray(chats)) return;
            for (const ch of chats) {
                if (ch.settings?.goodbye?.enabled) {
                    activeChannelId = String(ch.id);
                    activeConfig = ch.settings.goodbye;
                    return true;
                }
                if (Array.isArray(ch.topico)) {
                    for (const top of ch.topico) {
                        if (top.settings?.goodbye?.enabled) {
                            activeChannelId = String(top.id);
                            activeConfig = top.settings.goodbye;
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        if (Array.isArray(data.categoria)) {
            for (const cat of data.categoria) {
                if (checkChats(cat.chat)) break;
            }
        }
        if (!activeChannelId) checkChats(data.chat);

        if (!activeConfig && data.settings?.goodbye?.enabled) {
            activeConfig = data.settings.goodbye;
            activeChannelId = null;
        }

        if (!activeConfig) {
            console.log(`[welcomeHelper] Goodbye do Discord não encontrado para ${guildId}.`);
            return;
        }

        let channel = null;
        if (activeChannelId) {
            channel = member.guild.channels.cache.get(activeChannelId) ||
                await member.guild.channels.fetch(activeChannelId).catch(() => null);
        }

        if (!channel) {
            channel = member.guild.systemChannel ||
                member.guild.channels.cache.find(ch => ch?.isTextBased?.() && ch?.send);
        }

        if (!channel) {
            console.log(`[welcomeHelper] Não foi possível localizar um canal para enviar o goodbye de ${guildId}.`);
            return;
        }

        const text = formatWelcomeText(activeConfig.text, {
            user: member.user?.username || member.displayName || `Usuário ${member.id}`,
            group: member.guild.name,
            count: member.guild.memberCount
        });

        await _sendDiscordMsg(channel, activeConfig, text);
    } catch (err) {
        console.error("[welcomeHelper] Erro ao enviar despedida no Discord:", err);
    }
}

// ─────────────────────────────────────────────────────────────
//  TELEGRAM — JOIN / LEAVE
// ─────────────────────────────────────────────────────────────

async function handleTelegramMemberJoin(ctx) {
    try {
        if (!ctx || !ctx.message || !Array.isArray(ctx.message.new_chat_members)) return;
        const chatId = String(ctx.chat.id);
        const threadId = ctx.message.message_thread_id ? String(ctx.message.message_thread_id) : null;

        for (const newMember of ctx.message.new_chat_members) {
            const name = newMember.first_name
                ? `${newMember.first_name}${newMember.last_name ? " " + newMember.last_name : ""}`
                : (newMember.username ? `@${newMember.username}` : `Usuário ${newMember.id}`);
            console.log(`📥[telegram] ${name} (${newMember.id}) entrou em ${ctx.chat.title || chatId} (${chatId})`);

            if (newMember.is_bot && global.telegramBot?.botInfo?.id === newMember.id) continue;

            const { config } = getWelcomeConfig("telegram", null, chatId, threadId);
            if (!config || !config.enabled) continue;

            const count = await ctx.getChatMembersCount().catch(() => null);
            const mention = newMember.username ? `@${newMember.username}` : `[${name}](tg://user?id=${newMember.id})`;
            const text = formatWelcomeText(config.text, { user: mention, group: ctx.chat.title || "Grupo", count });

            await _sendTelegramMsg(ctx, chatId, config, text, threadId);
        }
    } catch (err) {
        console.error("[welcomeHelper] Erro ao enviar boas-vindas no Telegram:", err);
    }
}

async function handleTelegramMemberLeave(ctx) {
    try {
        if (!ctx || !ctx.message || !ctx.message.left_chat_member) return;
        const chatId = String(ctx.chat.id);
        const threadId = ctx.message.message_thread_id ? String(ctx.message.message_thread_id) : null;
        const leftMember = ctx.message.left_chat_member;

        const name = leftMember.first_name
            ? `${leftMember.first_name}${leftMember.last_name ? " " + leftMember.last_name : ""}`
            : (leftMember.username ? `@${leftMember.username}` : `Usuário ${leftMember.id}`);
        console.log(`📤[telegram] ${name} (${leftMember.id}) saiu de ${ctx.chat.title || chatId} (${chatId})`);

        if (leftMember.is_bot && global.telegramBot?.botInfo?.id === leftMember.id) return;

        const { config } = getGoodbyeConfig("telegram", null, chatId, threadId);
        if (!config || !config.enabled) return;

        const count = await ctx.getChatMembersCount().catch(() => null);
        const mention = leftMember.username ? `@${leftMember.username}` : `[${name}](tg://user?id=${leftMember.id})`;
        const text = formatWelcomeText(config.text, { user: mention, group: ctx.chat.title || "Grupo", count });

        await _sendTelegramMsg(ctx, chatId, config, text, threadId);
    } catch (err) {
        console.error("[welcomeHelper] Erro ao enviar despedida no Telegram:", err);
    }
}

// ─────────────────────────────────────────────────────────────
//  WHATSAPP — JOIN / LEAVE
// ─────────────────────────────────────────────────────────────

async function handleWhatsAppMemberJoin(sock, update) {
    try {
        if (!sock || !update || update.action !== "add" || !Array.isArray(update.participants)) return;
        const groupId = update.id;
        if (!groupId || !groupId.endsWith("@g.us")) return;

        const metadata = await sock.groupMetadata(groupId).catch(() => null);
        const groupName = metadata ? metadata.subject : "Grupo";
        const count = metadata ? metadata.participants.length : null;

        const { config } = getWelcomeConfig("whatsapp", null, groupId, null);

        for (const participantRaw of update.participants) {
            const participantJid = typeof participantRaw === "string"
                ? participantRaw
                : (participantRaw?.id || participantRaw?.jid || String(participantRaw));
            if (!participantJid || typeof participantJid !== "string") continue;

            const userNum = participantJid.split("@")[0];
            console.log(`📥[whatsapp] +${userNum} entrou em ${groupName} (${groupId})`);

            if (!config || !config.enabled) continue;

            const text = formatWelcomeText(config.text, { user: `@${userNum}`, group: groupName, count });
            await _sendWhatsAppMsg(sock, groupId, config, text, participantJid);
        }
    } catch (err) {
        console.error("[welcomeHelper] Erro ao enviar boas-vindas no WhatsApp:", err);
    }
}

async function handleWhatsAppMemberLeave(sock, update) {
    try {
        if (!sock || !update || (update.action !== "remove" && update.action !== "leave") || !Array.isArray(update.participants)) return;
        const groupId = update.id;
        if (!groupId || !groupId.endsWith("@g.us")) return;

        const metadata = await sock.groupMetadata(groupId).catch(() => null);
        const groupName = metadata ? metadata.subject : "Grupo";
        const count = metadata ? metadata.participants.length : null;

        const { config } = getGoodbyeConfig("whatsapp", null, groupId, null);

        for (const participantRaw of update.participants) {
            const participantJid = typeof participantRaw === "string"
                ? participantRaw
                : (participantRaw?.id || participantRaw?.jid || String(participantRaw));
            if (!participantJid || typeof participantJid !== "string") continue;

            const userNum = participantJid.split("@")[0];
            console.log(`📤[whatsapp] +${userNum} saiu de ${groupName} (${groupId})`);

            if (!config || !config.enabled) continue;

            const text = formatWelcomeText(config.text, { user: `@${userNum}`, group: groupName, count });
            await _sendWhatsAppMsg(sock, groupId, config, text, participantJid);
        }
    } catch (err) {
        console.error("[welcomeHelper] Erro ao enviar despedida no WhatsApp:", err);
    }
}

module.exports = {
    downloadAndSaveMediaLocally,
    storeMedia,
    formatWelcomeText,
    getDefaultWelcomeConfig,
    getDefaultGoodbyeConfig,
    getWelcomeConfig,
    getGoodbyeConfig,
    saveWelcomeConfig,
    saveGoodbyeConfig,
    handleDiscordMemberJoin,
    handleDiscordMemberLeave,
    handleTelegramMemberJoin,
    handleTelegramMemberLeave,
    handleWhatsAppMemberJoin,
    handleWhatsAppMemberLeave
};
