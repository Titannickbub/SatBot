const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const send = require("./send");

const SETTINGS_DIR = path.join(__dirname, "..", "settings");
const STORE_PATH = path.join(SETTINGS_DIR, "suggestions.json");
const MEDIA_DIR = path.join(SETTINGS_DIR, "suggestions_media");
const MAX_TEXT_LENGTH = 4000;
const MAX_MEDIA_SIZE = 10 * 1024 * 1024;
const PLATFORMS = new Set(["whatsapp", "telegram", "discord"]);
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/bmp"]);
const DEFAULT_DATA = {
    nextId: 0,
    settings: { enabled: false, enabledConfigured: false, channels: {} },
    suggestions: []
};

function readData() {
    if (!fs.existsSync(STORE_PATH)) return JSON.parse(JSON.stringify(DEFAULT_DATA));
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        !Number.isSafeInteger(data.nextId) || data.nextId < 0 ||
        !data.settings || typeof data.settings !== "object" ||
        !Array.isArray(data.suggestions)) {
        throw new Error("O arquivo de sugestões está inválido.");
    }
    data.settings.enabledConfigured = data.settings.enabledConfigured === true;
    data.settings.enabled = data.settings.enabledConfigured && data.settings.enabled === true;
    if (!data.settings.channels || typeof data.settings.channels !== "object" ||
        Array.isArray(data.settings.channels)) {
        data.settings.channels = {};
    }
    return data;
}

function writeData(data) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    const temporaryPath = `${STORE_PATH}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    let descriptor;
    try {
        descriptor = fs.openSync(temporaryPath, "wx");
        fs.writeFileSync(descriptor, `${JSON.stringify(data, null, 2)}\n`, "utf8");
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = null;
        fs.renameSync(temporaryPath, STORE_PATH);
    } catch (error) {
        if (descriptor !== undefined && descriptor !== null) fs.closeSync(descriptor);
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
        throw error;
    }
}

function assertPlatform(platform) {
    const normalized = String(platform || "").toLowerCase();
    if (!PLATFORMS.has(normalized)) throw new Error("Plataforma inválida.");
    return normalized;
}

function getSettings() {
    return readData().settings;
}

function updateSettings({ enabled, platform, channel }) {
    const data = readData();
    if (typeof enabled === "boolean") {
        data.settings.enabled = enabled;
        data.settings.enabledConfigured = true;
    }
    if (platform) {
        const targetPlatform = assertPlatform(platform);
        const chatId = String(channel?.chatId || "").trim();
        if (!chatId) {
            delete data.settings.channels[targetPlatform];
        } else {
            const threadId = channel.threadId ? String(channel.threadId).trim() : "";
            const name = String(channel.name || chatId).trim();
            if (chatId.length > 120 || threadId.length > 120 || name.length > 120) {
                throw new Error("Os dados do canal de sugestões excedem o limite de 120 caracteres.");
            }
            data.settings.channels[targetPlatform] = {
                chatId,
                threadId: threadId || null,
                name: name || chatId
            };
        }
    }
    writeData(data);
    return data.settings;
}

function list() {
    return readData().suggestions
        .slice()
        .sort((left, right) => Number(right.id) - Number(left.id));
}

function get(id) {
    const wanted = String(id);
    return readData().suggestions.find(item => String(item.id) === wanted) || null;
}

function getMediaPath(suggestion) {
    if (!suggestion?.mediaFile || path.basename(suggestion.mediaFile) !== suggestion.mediaFile) {
        return null;
    }
    return path.join(MEDIA_DIR, suggestion.mediaFile);
}

function getMedia(id) {
    const suggestion = get(id);
    if (!suggestion?.media) return null;
    const filePath = getMediaPath(suggestion);
    if (!filePath || !fs.existsSync(filePath)) return null;
    return { filePath, mimeType: suggestion.media.mimeType, fileName: suggestion.media.fileName };
}

function getText(message) {
    const args = Array.isArray(message.args) ? message.args : [];
    return args.join(" ").trim();
}

async function getImageBuffer(message) {
    const media = message.media || message.quoted?.media;
    if (!media) return null;
    const mimeType = String(media.mimeType || "").toLowerCase();
    if (!IMAGE_TYPES.has(mimeType)) {
        throw new Error("Envie uma imagem PNG, JPEG, GIF, WebP ou BMP.");
    }
    let buffer = null;
    if (Buffer.isBuffer(media.buffer)) {
        buffer = media.buffer;
    } else if (media.buffer) {
        buffer = Buffer.from(media.buffer);
    } else if (typeof media.getBuffer === "function") {
        buffer = Buffer.from(await media.getBuffer());
    }
    if (!buffer || buffer.length === 0 || buffer.length > MAX_MEDIA_SIZE) {
        throw new Error("A imagem está vazia, indisponível ou excede o limite de 10 MB.");
    }
    return {
        buffer,
        mimeType,
        fileName: String(media.fileName || `imagem-${Date.now()}`).slice(0, 120)
    };
}

function getChatName(message) {
    return String(
        message.groupName ||
        message.raw?.chat?.title ||
        message.raw?.guild?.name ||
        message.raw?.channel?.name ||
        message.raw?.channel?.parent?.name ||
        message.displayName ||
        message.chatId
    ).slice(0, 120);
}

function saveMedia(id, image) {
    if (!image) return null;
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const fileName = `suggestion_${id}.bin`;
    const filePath = path.join(MEDIA_DIR, fileName);
    const temporaryPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    try {
        fs.writeFileSync(temporaryPath, image.buffer, { flag: "wx" });
        fs.renameSync(temporaryPath, filePath);
    } catch (error) {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
        throw error;
    }
    return { fileName, filePath };
}

async function submit(message) {
    if (!getSettings().enabled) throw new Error("O envio de sugestões está desativado.");
    const platform = assertPlatform(message.platform);
    if (!String(message.userId || "").trim() || !String(message.chatId || "").trim()) {
        throw new Error("Não foi possível identificar seu usuário ou o chat de origem.");
    }
    const text = getText(message);
    if (text.length > MAX_TEXT_LENGTH) {
        throw new Error(`O texto da sugestão excede o limite de ${MAX_TEXT_LENGTH} caracteres.`);
    }
    const image = await getImageBuffer(message);
    if (!text && !image) throw new Error("Escreva sua sugestão ou envie uma foto com o comando.");

    const data = readData();
    if (!data.settings.enabled) throw new Error("O envio de sugestões está desativado.");
    const id = data.nextId;
    const storedMedia = saveMedia(id, image);
    const createdAt = Date.now();
    const suggestion = {
        id,
        status: "pending",
        platform,
        userId: String(message.userId || ""),
        name: String(message.displayName || message.username || message.userId || "Usuário").slice(0, 120),
        username: message.username ? String(message.username).slice(0, 120) : null,
        chatId: String(message.chatId || ""),
        chatName: getChatName(message),
        threadId: message.threadId ? String(message.threadId) : null,
        text,
        createdAt,
        ...(storedMedia ? {
            media: {
                fileName: image.fileName,
                mimeType: image.mimeType,
                size: image.buffer.length
            },
            mediaFile: storedMedia.fileName
        } : {})
    };

    try {
        data.nextId++;
        data.suggestions.push(suggestion);
        writeData(data);
    } catch (error) {
        if (storedMedia && fs.existsSync(storedMedia.filePath)) fs.unlinkSync(storedMedia.filePath);
        throw error;
    }
    return suggestion;
}

function setStatus(id, status, actorId) {
    if (!["accepted", "thanked", "rejected"].includes(status)) {
        throw new Error("Ação de sugestão inválida.");
    }
    const data = readData();
    const suggestion = data.suggestions.find(item => String(item.id) === String(id));
    if (!suggestion) throw new Error(`Sugestão ${id} não encontrada.`);
    suggestion.status = status;
    suggestion.updatedAt = Date.now();
    suggestion.updatedBy = String(actorId || "");
    writeData(data);
    return suggestion;
}

function remove(id) {
    const data = readData();
    const index = data.suggestions.findIndex(item => String(item.id) === String(id));
    if (index < 0) throw new Error(`Sugestão ${id} não encontrada.`);
    const [suggestion] = data.suggestions.splice(index, 1);
    writeData(data);
    const mediaPath = getMediaPath(suggestion);
    if (mediaPath && fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
    return suggestion;
}

function mentionDetails(suggestion) {
    if (suggestion.platform === "whatsapp") {
        const mention = `@${suggestion.userId.split("@")[0].split(":")[0]}`;
        return { label: mention, options: [suggestion.userId] };
    }
    if (suggestion.platform === "telegram") {
        const label = String(suggestion.name || suggestion.userId)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        return {
            label: `<a href="tg://user?id=${encodeURIComponent(suggestion.userId)}">${label}</a>`,
            options: { parse_mode: "HTML" }
        };
    }
    return {
        label: `<@${suggestion.userId}>`,
        options: { allowedMentions: { users: [suggestion.userId] } }
    };
}

async function notifyAuthor(suggestion, status) {
    const mention = mentionDetails(suggestion);
    const responses = {
        accepted: `✅ Sua sugestão #${suggestion.id} foi aceita. Obrigado por contribuir!`,
        thanked: `🙏 Obrigado pela sua sugestão #${suggestion.id}! A equipe agradece sua contribuição.`,
        rejected: `ℹ️ Sua sugestão #${suggestion.id} não foi aprovada. Obrigado por enviar sua contribuição.`
    };
    await send.text(
        suggestion.platform,
        suggestion.chatId,
        suggestion.threadId,
        `${mention.label} ${responses[status]}`,
        mention.options
    );
}

function formatForChannel(suggestion) {
    const date = new Date(suggestion.createdAt).toLocaleString("pt-BR");
    const user = [suggestion.name, suggestion.username ? `@${suggestion.username}` : null]
        .filter(Boolean).join(" ");
    return [
        `📨 Nova sugestão #${suggestion.id} · ${suggestion.platform}`,
        `Usuário: ${user} · ID: ${suggestion.userId}`,
        `Chat: ${suggestion.chatName} · ID: ${suggestion.chatId}${suggestion.threadId ? ` · Tópico: ${suggestion.threadId}` : ""}`,
        `Data: ${date}`,
        suggestion.text || "Sugestão enviada com imagem."
    ].join("\n");
}

async function deliver(suggestion) {
    const channel = getSettings().channels[suggestion.platform];
    if (!channel?.chatId) return { sent: false };
    await send.text(
        suggestion.platform,
        channel.chatId,
        channel.threadId,
        formatForChannel(suggestion)
    );
    if (suggestion.mediaFile) {
        const filePath = getMediaPath(suggestion);
        if (!filePath || !fs.existsSync(filePath)) {
            throw new Error(`A imagem da sugestão ${suggestion.id} não foi encontrada no armazenamento.`);
        }
        await send.image(
            suggestion.platform,
            channel.chatId,
            channel.threadId,
            fs.readFileSync(filePath),
            `Imagem da sugestão #${suggestion.id}`
        );
    }
    return { sent: true };
}

module.exports = {
    MAX_TEXT_LENGTH,
    MAX_MEDIA_SIZE,
    assertPlatform,
    getSettings,
    updateSettings,
    list,
    get,
    getMedia,
    submit,
    setStatus,
    remove,
    notifyAuthor,
    deliver,
    formatForChannel
};
