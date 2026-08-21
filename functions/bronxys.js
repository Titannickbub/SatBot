const path = require("path");
const fs = require("fs");
const api = require("./api");

const CONFIG_FILE = path.join(__dirname, "..", "settings", "bronxys.json");

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        const defaultConfig = { apiKey: "" };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 4));
        return defaultConfig;
    }

    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    } catch {
        console.error("[BRONXYS] Erro ao ler configuração, usando padrão");
        return { apiKey: "" };
    }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4), "utf8");
}

function setApiKey(newKey) {
    const config = loadConfig();
    config.apiKey = newKey;
    saveConfig(config);
    return config.apiKey;
}

function getApiKey() {
    const config = loadConfig();
    if (!config.apiKey) {
        throw new Error(
            "[BRONXYS] API Key não configurada em settings/bronxys.json"
        );
    }
    return config.apiKey;
}

function cleanMediaUrl(url) {
    if (!url || typeof url !== "string") return url;

    let cleaned = url.trim();

    // Instagram fixers (uuinstagram, ddinstagram, vxinstagram, kkinstagram, ginstagram, instagr.am, etc.)
    cleaned = cleaned.replace(/https?:\/\/(?:www\.)?(?:uu|dd|vx|kk|g)instagram\.com/i, "https://www.instagram.com");
    cleaned = cleaned.replace(/https?:\/\/(?:www\.)?instagr\.am/i, "https://www.instagram.com");

    // Twitter / X fixers (fxtwitter, vxtwitter, fixvxtwitter, fixupx, twittpr, etc.)
    cleaned = cleaned.replace(/https?:\/\/(?:www\.)?(?:fx|vx|fixv|fixup)?twitter\.com/i, "https://twitter.com");
    cleaned = cleaned.replace(/https?:\/\/(?:www\.)?fixupx\.com/i, "https://x.com");

    // TikTok fixers (vxtiktok, tiktktx, etc.)
    cleaned = cleaned.replace(/https?:\/\/(?:www\.)?(?:vx|tiktk)tiktok\.com/i, "https://www.tiktok.com");

    return cleaned;
}

const BASE_URL = "https://api.bronxyshost.com.br/api-bronxys";

async function searchYouTube(query) {
    const apiKey = getApiKey();
    const encodedQuery = encodeURIComponent(query);

    return await api.fetchJson(
        `${BASE_URL}/pesquisa_ytb?nome=${encodedQuery}&apikey=${apiKey}`
    );
}

async function downloadYouTubeAudio(query) {
    const apiKey = getApiKey();
    const cleanQuery = cleanMediaUrl(query);
    const encodedQuery = encodeURIComponent(cleanQuery);

    return await api.fetchBuffer(
        `${BASE_URL}/play?nome_url=${encodedQuery}&apikey=${apiKey}`
    );
}

async function downloadYouTubeVideo(query) {
    const apiKey = getApiKey();
    const cleanQuery = cleanMediaUrl(query);
    const encodedQuery = encodeURIComponent(cleanQuery);

    return await api.fetchBuffer(
        `${BASE_URL}/play_video?nome_url=${encodedQuery}&apikey=${apiKey}`
    );
}

async function downloadTikTok(url) {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    return await api.fetchBuffer(
        `${BASE_URL}/tiktok?url=${encodedUrl}&apikey=${apiKey}`
    );
}

async function downloadInstagram(url) {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    const data = await api.fetchJson(
        `${BASE_URL}/instagram?url=${encodedUrl}&apikey=${apiKey}`
    );

    if (!data.msg || !data.msg[0]) {
        throw new Error("[BRONXYS] Nenhuma mídia encontrada no Instagram");
    }

    return await api.fetchBuffer(data.msg[0].url);
}

async function downloadSpotify(url) {
    const apiKey = getApiKey();
    const encodedUrl = encodeURIComponent(url);

    return await api.fetchBuffer(
        `${BASE_URL}/spotify?url=${encodedUrl}&apikey=${apiKey}`
    );
}

async function downloadTwitter(url, type = "video") {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    const endpoint = type === "audio" ? "twitter_audio" : "twitter_video";

    return await api.fetchBuffer(
        `${BASE_URL}/${endpoint}?url=${encodedUrl}&apikey=${apiKey}`
    );
}

async function downloadFacebook(url, type = "video") {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    const endpoint = type === "audio" ? "face_audio" : "face_video";

    return await api.fetchBuffer(
        `${BASE_URL}/${endpoint}?url=${encodedUrl}&apikey=${apiKey}`
    );
}

async function downloadKwai(url) {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    return await api.fetchBuffer(
        `${BASE_URL}/kwai?url=${encodedUrl}&apikey=${apiKey}`
    );
}

function checkFileSize(buffer, platform) {
    const limits = {
        discord: 25 * 1024 * 1024,      // 25 MB (sem Nitro)
        telegram: 20 * 1024 * 1024,     // 20 MB (limite Telegram Bot API)
        whatsapp: 16 * 1024 * 1024      // 16 MB
    };

    const limit = limits[platform] || 25 * 1024 * 1024;
    const sizeMB = buffer.length / 1024 / 1024;

    if (buffer.length > limit) {
        throw new Error(
            `Arquivo muito grande para ${platform}. Tamanho: ${sizeMB.toFixed(2)}MB, limite: ${(limit / 1024 / 1024).toFixed(0)}MB`
        );
    }

    return { sizeMB, limit: limit / 1024 / 1024 };
}

async function verifyApiKey(keyToVerify) {
    const apiKey = keyToVerify || (loadConfig().apiKey || "");

    return await api.postJson(`${BASE_URL}/verify-key`, {
        apikey: apiKey
    });
}

function detectMediaLinkType(url) {
    if (!url || typeof url !== 'string') return null;

    const normalized = cleanMediaUrl(url);
    if (!/^https?:\/\//i.test(normalized)) return null;

    if (/youtube\.com|youtu\.be/i.test(normalized)) {
        return { platform: 'youtube', type: 'audio' };
    }

    if (/tiktok\.com/i.test(normalized)) {
        return { platform: 'tiktok', type: 'video' };
    }

    if (/instagram\.com/i.test(normalized)) {
        return { platform: 'instagram', type: 'video' };
    }

    if (/x\.com|twitter\.com/i.test(normalized)) {
        return { platform: 'twitter', type: 'video' };
    }

    if (/facebook\.com/i.test(normalized)) {
        return { platform: 'facebook', type: 'video' };
    }

    if (/kwai\.com/i.test(normalized)) {
        return { platform: 'kwai', type: 'video' };
    }

    return null;
}

async function autodownloadSupportedLink(url, targetPlatform = null) {
    const cleanUrl = cleanMediaUrl(url);
    const detected = detectMediaLinkType(cleanUrl);
    if (!detected) {
        throw new Error('URL não suportada para autodownload');
    }

    const { platform, type } = detected;
    let result = null;

    if (platform === 'youtube') {
        result = {
            platform,
            type,
            buffer: await downloadYouTubeAudio(cleanUrl),
            mimeType: 'audio/mpeg',
            filename: 'youtube-audio.mp3'
        };
    } else if (platform === 'tiktok') {
        result = {
            platform,
            type,
            buffer: await downloadTikTok(cleanUrl),
            mimeType: 'video/mp4',
            filename: 'tiktok-video.mp4'
        };
    } else if (platform === 'instagram') {
        result = {
            platform,
            type,
            buffer: await downloadInstagram(cleanUrl),
            mimeType: 'video/mp4',
            filename: 'instagram-video.mp4'
        };
    } else if (platform === 'twitter') {
        result = {
            platform,
            type,
            buffer: await downloadTwitter(cleanUrl, 'video'),
            mimeType: 'video/mp4',
            filename: 'twitter-video.mp4'
        };
    } else if (platform === 'facebook') {
        result = {
            platform,
            type,
            buffer: await downloadFacebook(cleanUrl, 'video'),
            mimeType: 'video/mp4',
            filename: 'facebook-video.mp4'
        };
    } else if (platform === 'kwai') {
        result = {
            platform,
            type,
            buffer: await downloadKwai(cleanUrl),
            mimeType: 'video/mp4',
            filename: 'kwai-video.mp4'
        };
    } else {
        throw new Error(`Autodownload não implementado para ${platform}`);
    }

    if (targetPlatform && result && result.buffer) {
        checkFileSize(result.buffer, targetPlatform);
    }

    return result;
}

module.exports = {
    loadConfig,
    saveConfig,
    getApiKey,
    setApiKey,
    searchYouTube,
    downloadYouTubeAudio,
    downloadYouTubeVideo,
    downloadTikTok,
    downloadInstagram,
    downloadSpotify,
    downloadTwitter,
    downloadFacebook,
    downloadKwai,
    checkFileSize,
    verifyApiKey,
    cleanMediaUrl,
    detectMediaLinkType,
    autodownloadSupportedLink
};