const fs = require("fs");
const path = require("path");

const file =
    path.join(
        __dirname,
        "..",
        "settings",
        "config.json"
    );

let cache = null;

const DEFAULT_CONFIG = {
    prefix: "!",
    botName: "Satella",
    platforms: {},
    uploads: {
        discordChannelId: null,
        telegramChatId: null
    }
};

function normalizeConfig(data) {
    const source = data && typeof data === "object" ? data : {};
    const normalized = {
        ...DEFAULT_CONFIG,
        ...source,
        platforms: {
            ...DEFAULT_CONFIG.platforms,
            ...(source.platforms && typeof source.platforms === "object" ? source.platforms : {})
        },
        uploads: {
            ...DEFAULT_CONFIG.uploads,
            ...(source.uploads && typeof source.uploads === "object" ? source.uploads : {})
        }
    };

    if (typeof normalized.prefix !== "string" || !normalized.prefix.trim()) {
        normalized.prefix = DEFAULT_CONFIG.prefix;
    }

    if (typeof normalized.botName !== "string" || !normalized.botName.trim()) {
        normalized.botName = DEFAULT_CONFIG.botName;
    } else {
        normalized.botName = normalized.botName.trim();
    }

    return normalized;
}

function createDefault() {
    const data = normalizeConfig(DEFAULT_CONFIG);
    save(data);
    return data;
}

function load() {

    if (cache) {

        return cache;

    }

    if (!fs.existsSync(file)) {

        return createDefault();

    }

    try {

        cache = normalizeConfig(
            JSON.parse(
                fs.readFileSync(
                    file,
                    "utf8"
                )
            )
        );

    } catch {

        cache =
            createDefault();

    }

    return cache;

}

function save(data) {

    cache = normalizeConfig(data);

    // Ensure the settings directory exists before writing the file (fresh installs)
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
        file,
        JSON.stringify(
            cache,
            null,
            4
        )
    );

}

function getConfig() {

    return load();

}

function getPrefix() {

    return load().prefix;

}

function setPrefix(prefix) {

    const data = load();

    data.prefix =
        String(prefix);

    save(data);

}

function getPlatforms() {

    return load().platforms;

}

function setPlatform(
    platform,
    enabled
) {

    const data = load();

    data.platforms[
        platform.toLowerCase()
    ] = !!enabled;

    save(data);

}

function getUploadConfig() {
    const data = load();
    return data.uploads || {
        discordChannelId: null,
        telegramChatId: null
    };
}

function setUploadChannel(
    platform,
    channelId
) {
    const data = load();
    data.uploads = data.uploads || {
        discordChannelId: null,
        telegramChatId: null
    };

    if (platform.toLowerCase() === "discord") {
        data.uploads.discordChannelId = channelId ? String(channelId) : null;
    } else if (platform.toLowerCase() === "telegram") {
        data.uploads.telegramChatId = channelId ? String(channelId) : null;
    }

    save(data);
}

function syncPlatforms() {

    const data = load();

    const platformsDir =
        path.join(
            __dirname,
            "..",
            "platforms"
        );

    if (
        !fs.existsSync(
            platformsDir
        )
    ) {

        return;

    }

    const files =
        fs.readdirSync(
            platformsDir
        )
        .filter(
            file =>
                file.endsWith(".js")
        );

    const foundPlatforms = [];

    for (const file of files) {

        const name =
            file.replace(
                ".js",
                ""
            );

        foundPlatforms.push(
            name
        );

        if (
            typeof data.platforms[
                name
            ] === "undefined"
        ) {

            data.platforms[
                name
            ] = true;

        }

    }

    for (
        const platform
        of Object.keys(
            data.platforms
        )
    ) {

        if (
            !foundPlatforms.includes(
                platform
            )
        ) {

            delete data.platforms[
                platform
            ];

        }

    }

    save(data);

}

function isPlatformEnabled(
    platform
) {

    const data = load();

    return data.platforms[
        platform.toLowerCase()
    ] === true;

}

function getDefaultAutoDownloadConfig() {
    return {
        enabled: true,
        allowGroups: false,
        allowPrivate: true,
        supportedOnly: true
    };
}

function getAutoDownloadConfig() {
    const data = load();
    const defaults = getDefaultAutoDownloadConfig();
    if (!data.autodownload) {
        data.autodownload = defaults;
        save(data);
        return data.autodownload;
    }
    return {
        ...defaults,
        ...data.autodownload
    };
}

function setAutoDownloadEnabled(enabled) {
    const data = load();
    data.autodownload = getAutoDownloadConfig();
    data.autodownload.enabled = !!enabled;
    save(data);
    return data.autodownload.enabled;
}

function getDefaultAntiPVConfig() {
    return {
        enabled: false,
        mode: "ignore",
        message: "⚠️ O atendimento no PV está desativado no momento.",
        media: null,
        commandWhitelist: [],
        userWhitelist: []
    };
}

function getAntiPVConfig() {
    const data = load();
    const defaults = getDefaultAntiPVConfig();
    if (!data.antipv) {
        data.antipv = defaults;
        save(data);
        return data.antipv;
    }
    return {
        ...defaults,
        ...data.antipv,
        commandWhitelist: Array.isArray(data.antipv.commandWhitelist) ? data.antipv.commandWhitelist : [],
        userWhitelist: Array.isArray(data.antipv.userWhitelist) ? data.antipv.userWhitelist : []
    };
}

function setAntiPVEnabled(enabled) {
    const data = load();
    data.antipv = getAntiPVConfig();
    data.antipv.enabled = !!enabled;
    save(data);
    return data.antipv.enabled;
}

function setAntiPVMode(mode) {
    const data = load();
    data.antipv = getAntiPVConfig();
    const validModes = ["ignore", "reply", "mensagem"];
    const normalizedMode = mode ? String(mode).toLowerCase() : "ignore";
    data.antipv.mode = (normalizedMode === "reply" || normalizedMode === "mensagem") ? "reply" : "ignore";
    save(data);
    return data.antipv.mode;
}

function setAntiPVMessage(text) {
    const data = load();
    data.antipv = getAntiPVConfig();
    data.antipv.message = text ? String(text) : "";
    save(data);
    return data.antipv.message;
}

function setAntiPVMedia(mediaObj) {
    const data = load();
    data.antipv = getAntiPVConfig();
    data.antipv.media = mediaObj || null;
    save(data);
    return data.antipv.media;
}

function addAntiPVCommand(commandName) {
    const data = load();
    data.antipv = getAntiPVConfig();
    const cmd = String(commandName).toLowerCase().trim();
    if (!cmd) return false;
    if (!data.antipv.commandWhitelist.includes(cmd)) {
        data.antipv.commandWhitelist.push(cmd);
        save(data);
        return true;
    }
    return false;
}

function removeAntiPVCommand(commandName) {
    const data = load();
    data.antipv = getAntiPVConfig();
    const cmd = String(commandName).toLowerCase().trim();
    const initialLen = data.antipv.commandWhitelist.length;
    data.antipv.commandWhitelist = data.antipv.commandWhitelist.filter(c => c.toLowerCase() !== cmd);
    if (data.antipv.commandWhitelist.length !== initialLen) {
        save(data);
        return true;
    }
    return false;
}

function addAntiPVUser(userId) {
    const data = load();
    data.antipv = getAntiPVConfig();
    const id = String(userId).trim();
    if (!id) return false;
    if (!data.antipv.userWhitelist.includes(id)) {
        data.antipv.userWhitelist.push(id);
        save(data);
        return true;
    }
    return false;
}

function removeAntiPVUser(userId) {
    const data = load();
    data.antipv = getAntiPVConfig();
    const id = String(userId).trim();
    const initialLen = data.antipv.userWhitelist.length;
    data.antipv.userWhitelist = data.antipv.userWhitelist.filter(u => u !== id);
    if (data.antipv.userWhitelist.length !== initialLen) {
        save(data);
        return true;
    }
    return false;
}

function saveAntiPVMediaLocally(buffer, fileName = "antipv_media", mimeType = "") {
    const antipvUploadDir = path.join(__dirname, "..", "settings", "uploads", "antipv");
    if (!fs.existsSync(antipvUploadDir)) {
        fs.mkdirSync(antipvUploadDir, { recursive: true });
    }
    let ext = ".bin";
    const lowerFile = String(fileName || "").toLowerCase();
    const lowerMime = String(mimeType || "").toLowerCase();

    if (lowerFile.endsWith(".mp4") || lowerMime.includes("mp4") || lowerMime.includes("video")) ext = ".mp4";
    else if (lowerFile.endsWith(".gif") || lowerMime.includes("gif")) ext = ".gif";
    else if (lowerFile.endsWith(".webp") || lowerMime.includes("webp")) ext = ".webp";
    else if (lowerFile.endsWith(".jpg") || lowerFile.endsWith(".jpeg") || lowerMime.includes("jpeg") || lowerMime.includes("jpg")) ext = ".jpg";
    else if (lowerFile.endsWith(".png") || lowerMime.includes("png")) ext = ".png";
    else if (lowerFile.endsWith(".mp3") || lowerMime.includes("audio") || lowerMime.includes("mp3")) ext = ".mp3";

    const safeName = `antipv_${Date.now()}${ext}`;
    const filePath = path.join(antipvUploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    let type = "photo";
    if (ext === ".mp4") type = "video";
    else if (ext === ".mp3" || lowerMime.includes("audio")) type = "audio";
    else if (ext === ".bin") type = "document";

    return {
        path: filePath,
        mimeType: mimeType || "application/octet-stream",
        type,
        fileName: safeName
    };
}

function parseTimeString(timeStr) {
    if (typeof timeStr === "number") {
        return timeStr >= 0 ? timeStr : null;
    }
    if (!timeStr || (typeof timeStr !== "string" && typeof timeStr !== "number")) {
        return null;
    }

    const str = String(timeStr).trim().toLowerCase();
    const match = str.match(/^(\d+)\s*([a-z]*)$/);
    if (!match) {
        return null;
    }

    const num = parseInt(match[1], 10);
    const unit = match[2];

    if (isNaN(num) || num < 0) {
        return null;
    }

    if (!unit || unit === "s" || unit === "sec" || unit === "seg" || unit === "segundos" || unit === "seconds") {
        return num;
    }
    if (unit === "m" || unit === "min" || unit === "minutos" || unit === "minutes") {
        return num * 60;
    }
    if (unit === "h" || unit === "hr" || unit === "horas" || unit === "hours") {
        return num * 3600;
    }

    return null;
}

function formatTimeString(seconds) {
    const sec = parseInt(seconds, 10);
    if (isNaN(sec) || sec < 0) {
        return "30s";
    }
    if (sec >= 3600 && sec % 3600 === 0) {
        return `${sec / 3600}h (${sec}s)`;
    }
    if (sec >= 60 && sec % 60 === 0) {
        return `${sec / 60}m (${sec}s)`;
    }
    return `${sec}s`;
}

function getIgnoreInitialSeconds() {
    const data = load();
    return typeof data.ignoreInitialSeconds === "number" ? data.ignoreInitialSeconds : 30;
}

function setIgnoreInitialSeconds(secondsInput) {
    const parsed = parseTimeString(secondsInput);
    if (parsed === null) {
        return false;
    }
    const data = load();
    data.ignoreInitialSeconds = parsed;
    save(data);
    return parsed;
}

function getBotName() {
    const data = load();
    if (data && typeof data === "object" && typeof data.botName === "string" && data.botName.trim()) {
        return data.botName.trim();
    }
    return "Satella";
}

function setBotName(name) {
    const data = load();
    data.botName = name ? String(name).trim() : "";
    save(data);
    return getBotName();
}

function getDefaultOnlyChatsConfig() {
    return {
        enabled: false,
        mode: "ignore",
        message: "⚠️ Este bot está configurado em modo exclusivo (onlychats) e não está autorizado a responder neste chat/servidor.",
        whitelist: {
            servers: [],
            categories: [],
            chats: [],
            topics: [],
            commands: []
        }
    };
}

function getOnlyChatsConfig() {
    const data = load();
    const defaults = getDefaultOnlyChatsConfig();
    if (!data.onlychats) {
        data.onlychats = defaults;
        save(data);
        return data.onlychats;
    }
    return {
        ...defaults,
        ...data.onlychats,
        whitelist: {
            servers: Array.isArray(data.onlychats?.whitelist?.servers) ? data.onlychats.whitelist.servers : [],
            categories: Array.isArray(data.onlychats?.whitelist?.categories) ? data.onlychats.whitelist.categories : [],
            chats: Array.isArray(data.onlychats?.whitelist?.chats) ? data.onlychats.whitelist.chats : [],
            topics: Array.isArray(data.onlychats?.whitelist?.topics) ? data.onlychats.whitelist.topics : [],
            commands: Array.isArray(data.onlychats?.whitelist?.commands) ? data.onlychats.whitelist.commands : []
        }
    };
}

function setOnlyChatsEnabled(enabled) {
    const data = load();
    data.onlychats = getOnlyChatsConfig();
    data.onlychats.enabled = !!enabled;
    save(data);
    return data.onlychats.enabled;
}

function setOnlyChatsMode(mode) {
    const data = load();
    data.onlychats = getOnlyChatsConfig();
    const normalizedMode = mode ? String(mode).toLowerCase().trim() : "ignore";
    data.onlychats.mode = normalizedMode === "reply" || normalizedMode === "mensagem" ? "reply" : "ignore";
    save(data);
    return data.onlychats.mode;
}

function setOnlyChatsMessage(text) {
    const data = load();
    data.onlychats = getOnlyChatsConfig();
    data.onlychats.message = text ? String(text).trim() : "";
    save(data);
    return data.onlychats.message;
}

function normalizeOnlyChatsKey(type) {
    if (!type) return null;
    const t = String(type).toLowerCase().trim();
    if (t === "server" || t === "servers" || t === "servidor" || t === "servidores") return "servers";
    if (t === "categoria" || t === "categorias" || t === "category" || t === "categories") return "categories";
    if (t === "chat" || t === "chats" || t === "canal" || t === "canais" || t === "grupo" || t === "grupos") return "chats";
    if (t === "topico" || t === "topicos" || t === "topic" || t === "topics" || t === "thread" || t === "threads") return "topics";
    if (t === "comando" || t === "comandos" || t === "command" || t === "commands" || t === "cmd" || t === "cmds") return "commands";
    return null;
}

function addOnlyChatsItem(type, id, name) {
    const key = normalizeOnlyChatsKey(type);
    if (!key) return false;
    let itemId = String(id).trim();
    if (key === "commands") {
        itemId = itemId.toLowerCase().replace(/^!/, "");
    }
    if (!itemId) return false;

    const data = load();
    data.onlychats = getOnlyChatsConfig();

    const list = data.onlychats.whitelist[key];
    const index = list.findIndex(item => {
        const existingId = typeof item === "object" && item !== null ? String(item.id) : String(item);
        return existingId === itemId;
    });

    const newItem = { id: itemId, name: name ? String(name).trim() : itemId };

    if (index >= 0) {
        list[index] = newItem;
    } else {
        list.push(newItem);
    }

    save(data);
    return true;
}

function removeOnlyChatsItem(type, id) {
    const key = normalizeOnlyChatsKey(type);
    if (!key) return false;
    let itemId = String(id).trim();
    if (key === "commands") {
        itemId = itemId.toLowerCase().replace(/^!/, "");
    }
    if (!itemId) return false;

    const data = load();
    data.onlychats = getOnlyChatsConfig();

    const list = data.onlychats.whitelist[key];
    const initialLen = list.length;
    data.onlychats.whitelist[key] = list.filter(item => {
        const existingId = typeof item === "object" && item !== null ? String(item.id) : String(item);
        return existingId !== itemId;
    });

    if (data.onlychats.whitelist[key].length !== initialLen) {
        save(data);
        return true;
    }
    return false;
}

function isIdInWhitelist(whitelistArray, idList) {
    if (!Array.isArray(whitelistArray) || !whitelistArray.length) return false;
    if (!Array.isArray(idList) || !idList.length) return false;

    return whitelistArray.some(item => {
        const itemId = typeof item === "object" && item !== null ? String(item.id) : String(item);
        return idList.includes(itemId);
    });
}

function isChatAllowedByOnlyChats(message) {
    if (!message) return true;
    if (message.isPrivate) return true;

    const onlychatsConfig = getOnlyChatsConfig();
    if (!onlychatsConfig || !onlychatsConfig.enabled) {
        return true;
    }

    const { whitelist } = onlychatsConfig;
    const raw = message.raw || {};

    // 1. Check Whitelisted Commands (bypass restriction for specific commands)
    const text = message.text ? String(message.text).trim() : "";
    const prefix = message.prefix || "!";
    if (text.startsWith(prefix)) {
        const commandName = text.split(/\s+/)[0].substring(prefix.length).toLowerCase();
        if (commandName && isIdInWhitelist(whitelist.commands, [commandName])) {
            return true;
        }
    }

    // 2. Check Server / Guild / Community
    const serverId = message.serverId || message.guildId || raw.guild?.id || raw.communityId || message.communityId;
    if (serverId && isIdInWhitelist(whitelist.servers, [String(serverId)])) {
        return true;
    }

    // 3. Check Category
    let categoryId = message.categoryId;
    if (!categoryId && raw.channel) {
        if (typeof raw.channel.isThread === "function" && raw.channel.isThread()) {
            categoryId = raw.channel.parent?.parentId || raw.channel.parent?.parent?.id;
        } else {
            categoryId = raw.channel.parentId || raw.channel.parent?.id;
        }
    }
    if (categoryId && isIdInWhitelist(whitelist.categories, [String(categoryId)])) {
        return true;
    }

    // 4. Check Chat / Channel
    const chatIds = [];
    const mainChatId = message.chatId || message.target?.chatId || raw.channel?.id || (raw.chat ? raw.chat.id : null);
    if (mainChatId) chatIds.push(String(mainChatId));

    if (raw.channel && typeof raw.channel.isThread === "function" && raw.channel.isThread()) {
        if (raw.channel.parentId) {
            chatIds.push(String(raw.channel.parentId));
        }
    }

    if (chatIds.length > 0 && isIdInWhitelist(whitelist.chats, chatIds)) {
        return true;
    }

    // 5. Check Topic / Thread
    const topicId = message.threadId || message.topicId || raw.message_thread_id ||
        (raw.channel && typeof raw.channel.isThread === "function" && raw.channel.isThread() ? raw.channel.id : null);
    if (topicId && isIdInWhitelist(whitelist.topics, [String(topicId)])) {
        return true;
    }

    return false;
}

module.exports = {

    getConfig,

    getPrefix,

    setPrefix,

    getPlatforms,

    setPlatform,

    getUploadConfig,

    setUploadChannel,

    isPlatformEnabled,

    syncPlatforms,

    getDefaultAutoDownloadConfig,
    getAutoDownloadConfig,
    setAutoDownloadEnabled,

    getAntiPVConfig,

    setAntiPVEnabled,

    setAntiPVMode,

    setAntiPVMessage,

    setAntiPVMedia,

    addAntiPVCommand,

    removeAntiPVCommand,

    addAntiPVUser,

    removeAntiPVUser,

    saveAntiPVMediaLocally,

    getIgnoreInitialSeconds,

    setIgnoreInitialSeconds,

    parseTimeString,

    formatTimeString,

    getBotName,

    setBotName,

    getDefaultOnlyChatsConfig,
    getOnlyChatsConfig,
    setOnlyChatsEnabled,
    setOnlyChatsMode,
    setOnlyChatsMessage,
    addOnlyChatsItem,
    removeOnlyChatsItem,
    isChatAllowedByOnlyChats

};