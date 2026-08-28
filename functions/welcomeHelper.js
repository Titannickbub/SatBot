const path = require("path");
const fs = require("fs");
const { loadSettings, saveSettings } = require("./groupSettings");
const config = require("./config");

const LOCAL_UPLOADS_DIR = path.join(__dirname, "..", "settings", "uploads");
const WHATSAPP_UPLOAD_DIR = path.join(LOCAL_UPLOADS_DIR, "whatsapp");

function ensureUploadDir() {
    if (!fs.existsSync(WHATSAPP_UPLOAD_DIR)) {
        fs.mkdirSync(WHATSAPP_UPLOAD_DIR, { recursive: true });
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

async function saveMediaLocally(buffer, fileName = "media") {
    ensureUploadDir();
    const ext = getFileExtension(fileName, "") || ".bin";
    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}${ext}`;
    const filePath = path.join(WHATSAPP_UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

function isTelegramFileId(value) {
    return typeof value === "string" && /^[A-Za-z0-9_\-:\/.]+$/.test(value) && !/^https?:\/\//i.test(value);
}

/**
 * Realiza o upload da mídia enviada para o canal de armazenamento do Discord
 * e retorna a URL CDN pública gerada.
 */
async function uploadMediaToDiscordStorage(buffer, fileName = "welcome_media", mimeType = "image/png", channelId = null, deleteAfter = false) {
    if (!global.discordClient) {
        throw new Error("Cliente Discord não está conectado/online para armazenar a mídia.");
    }

    const MAX_SIZE = 25 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
        const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
        throw new Error(`A mídia excede o tamanho máximo suportado pelo Discord (25MB). Tamanho enviado: ${sizeMb}MB.`);
    }

    if (!channelId) {
        throw new Error("Canal do Discord para upload não foi informado.");
    }

    let channel = global.discordClient.channels.cache.get(channelId);
    if (!channel) {
        try {
            channel = await global.discordClient.channels.fetch(channelId);
        } catch (err) {
            console.error("[welcomeHelper] Erro ao buscar canal de armazenamento do Discord:", err);
            throw new Error(`Não foi possível acessar o canal do Discord (${channelId}) para armazenar a mídia.`);
        }
    }

    if (!channel) {
        throw new Error(`Canal do Discord (${channelId}) não encontrado.`);
    }

    let ext = ".png";
    const lowerMime = (mimeType || "").toLowerCase();
    if (lowerMime.includes("gif")) ext = ".gif";
    else if (lowerMime.includes("jpeg") || lowerMime.includes("jpg")) ext = ".jpg";
    else if (lowerMime.includes("webp")) ext = ".webp";
    else if (lowerMime.includes("mp4") || lowerMime.includes("video")) ext = ".mp4";
    else if (fileName && fileName.includes(".")) {
        ext = path.extname(fileName);
    }

    const finalName = `welcome_${Date.now()}${ext}`;

    const sentMsg = await channel.send({
        content: `📁 [WELCOME_MEDIA] Upload realizado em ${new Date().toLocaleString("pt-BR")}`,
        files: [{
            attachment: buffer,
            name: finalName
        }]
    });

    const attachment = sentMsg.attachments.first();
    if (!attachment || !attachment.url) {
        throw new Error("Falha ao recuperar URL do anexo gerado pelo Discord.");
    }

    if (deleteAfter) {
        try {
            await sentMsg.delete();
        } catch (err) {
            // ignora falha de exclusão para não impedir o processo
        }
    }

    let mediaType = "photo";
    if (ext === ".gif" || lowerMime.includes("gif")) {
        mediaType = "gif";
    } else if (ext === ".mp4" || lowerMime.includes("video")) {
        mediaType = "video";
    }

    return {
        url: attachment.url,
        type: mediaType,
        fileName: finalName,
        size: buffer.length
    };
}

async function uploadMediaToTelegramStorage(ctx, buffer, fileName = "welcome_media", mimeType = "image/png", targetChatId) {
    if (!ctx || !ctx.telegram) {
        throw new Error("Contexto do Telegram não disponível para armazenar a mídia.");
    }

    const MAX_SIZE = 50 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
        const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
        throw new Error(`A mídia excede o tamanho máximo suportado pelo Telegram (50MB). Tamanho enviado: ${sizeMb}MB.`);
    }

    if (!targetChatId) {
        throw new Error("Chat do Telegram para upload não foi informado.");
    }

    const mediaType = normalizeMediaType(mimeType, fileName);
    const extra = { caption: `📁 [UPLOAD_MEDIA] Upload realizado em ${new Date().toLocaleString("pt-BR")}` };

    let sentMsg;
    if (mediaType === "video") {
        sentMsg = await ctx.telegram.sendVideo(targetChatId, { source: buffer }, extra);
    } else if (mediaType === "gif") {
        sentMsg = await ctx.telegram.sendAnimation(targetChatId, { source: buffer }, extra);
    } else {
        sentMsg = await ctx.telegram.sendPhoto(targetChatId, { source: buffer }, extra);
    }

    let fileId = null;
    if (mediaType === "video") {
        fileId = sentMsg.video?.file_id;
    } else if (mediaType === "gif") {
        fileId = sentMsg.animation?.file_id;
    } else {
        const photos = sentMsg.photo || [];
        if (photos.length) {
            fileId = photos[photos.length - 1].file_id;
        }
    }

    if (!fileId) {
        throw new Error("Falha ao recuperar o file_id gerado pelo Telegram.");
    }

    return {
        url: fileId,
        type: mediaType,
        fileName,
        size: buffer.length
    };
}

/**
 * Armazena uma mídia usando o melhor provedor disponível, independente da
 * plataforma do emissor do comando.
 *
 * Hierarquia de prioridade:
 *   1. Canal Discord configurado (discordChannelId) + cliente Discord online
 *   2. Chat Telegram configurado (telegramChatId) + contexto Telegram disponível
 *   3. Fallback: disco local (settings/uploads/whatsapp/)
 *
 * @param {string} platform  Plataforma do emissor (whatsapp|telegram|discord)
 * @param {object} message   Objeto de mensagem normalizado
 * @param {Buffer} buffer    Buffer da mídia
 * @param {string} fileName  Nome sugerido do arquivo
 * @param {string} mimeType  MIME type da mídia
 * @returns {Promise<{url, type, fileName, size, storageProvider}>}
 */
async function storeMedia(platform, message, buffer, fileName = "welcome_media", mimeType = "image/png") {
    const uploadConfig = config.getUploadConfig();

    // 1. Tentar Discord
    if (uploadConfig.discordChannelId && global.discordClient) {
        try {
            const result = await uploadMediaToDiscordStorage(
                buffer,
                fileName,
                mimeType,
                uploadConfig.discordChannelId,
                false
            );
            return { ...result, storageProvider: "discord" };
        } catch (err) {
            console.warn(`[storeMedia] Falha no upload para Discord, tentando próxima opção:`, err.message);
        }
    }

    // 2. Tentar Telegram
    if (uploadConfig.telegramChatId) {
        // Obtém o contexto Telegram: pode vir direto da mensagem (se emissor for Telegram)
        // ou do bot Telegram global
        const telegramCtx = message.raw?.telegram
            ? message.raw
            : (global.telegramBot ? { telegram: global.telegramBot.telegram } : null);

        if (telegramCtx) {
            try {
                const result = await uploadMediaToTelegramStorage(
                    telegramCtx,
                    buffer,
                    fileName,
                    mimeType,
                    uploadConfig.telegramChatId
                );
                return { ...result, storageProvider: "telegram" };
            } catch (err) {
                console.warn(`[storeMedia] Falha no upload para Telegram, usando armazenamento local:`, err.message);
            }
        }
    }

    // 3. Fallback: salvar localmente
    const localPath = await saveMediaLocally(buffer, fileName);
    return {
        url: localPath,
        type: normalizeMediaType(mimeType, fileName),
        fileName,
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
        const mediaUrl = config.media.url;
        const fileName = config.media.fileName || (() => {
            const detected = String(mediaUrl || "").split(/[#?]/)[0].split("/").pop();
            return detected && /\.[a-z0-9]+$/i.test(detected) ? detected : "welcome_media.jpg";
        })();

        // Se for caminho local no disco, lê o buffer diretamente
        const isLocalPath = typeof mediaUrl === "string" &&
            !mediaUrl.startsWith("http://") &&
            !mediaUrl.startsWith("https://") &&
            fs.existsSync(mediaUrl);

        const attachment = {
            attachment: isLocalPath ? fs.readFileSync(mediaUrl) : mediaUrl,
            name: fileName
        };

        return channel.send({ content: text, files: [attachment] });
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
        if (typeof mediaInput === "string" && fs.existsSync(mediaInput)) {
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
        const mediaUrl = config.media.url;
        const isLocalFile = typeof mediaUrl === "string" && fs.existsSync(mediaUrl);
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
    uploadMediaToDiscordStorage,
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
