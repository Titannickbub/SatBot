const path = require("path");
const fs = require("fs");
const api = require("./api");

const CONFIG_FILE = path.join(__dirname, "..", "settings", "bronxys.json");

function loadConfig() {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
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
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
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
        throw createApiError({ error: "API key não configurada" });
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

function getApiErrorText(payload) {
    if (Buffer.isBuffer(payload)) {
        payload = payload.toString("utf8");
    }
    if (typeof payload === "string") {
        const text = payload.trim();
        if (!text) return "";
        try {
            return getApiErrorText(JSON.parse(text));
        } catch {
            return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        }
    }
    if (!payload || typeof payload !== "object") return "";

    return [
        payload.error,
        payload.erro,
        payload.message,
        payload.msg,
        payload.detail,
        payload.description
    ].map(value => {
        if (typeof value === "string") return value;
        if (value && typeof value === "object") return getApiErrorText(value);
        return "";
    }).filter(Boolean).join(" ").trim();
}

function createApiError(errorOrPayload, status = null, keyToRedact = "") {
    const response = errorOrPayload?.response;
    const payload = response?.data ?? errorOrPayload;
    const responseStatus = status || response?.status || 0;
    const detail = getApiErrorText(payload);
    const normalizedDetail = detail.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const hostOnly = /apenas funciona.{0,60}(hospedagem|host)|funciona.{0,60}(hospedagem|host)|modo host|only works.{0,60}(hosting|host)|works only.{0,60}(hosting|host)/.test(normalizedDetail);
    const missingKey = /api\s*key.{0,40}(nao configurada|not configured|missing)/.test(normalizedDetail);
    const invalidKey = /api\s*key.{0,40}(invalid|invalida|nao valida|expirada)|chave.{0,40}(invalida|nao valida|expirada)/.test(normalizedDetail);
    const noCredits = /(sem|insufficient|no|acabou|esgotad).{0,40}(credit|credito|saldo|pedido)|nao.{0,20}(tem|possui).{0,30}(credit|credito|saldo|pedido)|credit.{0,40}(insufficient|empty|exhausted)|creditos?.{0,40}(insuficiente|indisponivel|esgotado)|saldo.{0,40}(insuficiente|zerado|esgotado)/.test(normalizedDetail);

    let userMessage;
    let code = "BRONXYS_API_ERROR";
    if (hostOnly) {
        code = "BRONXYS_HOST_ONLY";
        userMessage = "🚫 A Bronxys informou que o modo Host só funciona na hospedagem deles. Esta instalação está fora desse ambiente e não pode usar a chave gratuita exclusiva do Host. Configure uma chave própria com {prefix}setkey ou use a hospedagem Bronxys: https://dash.bronxyshost.com";
    } else if (noCredits || responseStatus === 402) {
        code = "BRONXYS_NO_CREDITS";
        userMessage = "💳 A Bronxys informou que não há créditos ou pedidos disponíveis para essa chave. Confira o saldo e as opções de recarga no painel: https://api.bronxyshost.com.br";
    } else if (missingKey) {
        code = "BRONXYS_KEY_MISSING";
        userMessage = "🔑 Nenhuma API key da Bronxys está configurada. Cadastre uma chave própria com {prefix}setkey e valide-a com {prefix}testbronxys.";
    } else if (invalidKey || responseStatus === 401 || responseStatus === 403) {
        code = "BRONXYS_INVALID_KEY";
        userMessage = "🔑 A Bronxys recusou a API key: ela pode estar inválida ou expirada. Confira a chave e atualize-a com {prefix}setkey; depois, valide com {prefix}testbronxys.";
    } else if (responseStatus === 429) {
        code = "BRONXYS_RATE_LIMIT";
        userMessage = "⏳ A Bronxys recebeu muitas solicitações em pouco tempo. Aguarde um pouco e tente novamente.";
    } else if (responseStatus || errorOrPayload?.isAxiosError) {
        userMessage = "⚠️ Não foi possível concluir a solicitação na API da Bronxys. Tente novamente em alguns instantes.";
    } else if (detail) {
        userMessage = `⚠️ A API da Bronxys retornou um erro: ${detail}`;
    } else {
        userMessage = "⚠️ A Bronxys não conseguiu concluir a solicitação. Tente novamente em alguns instantes.";
    }

    const keysToRedact = [loadConfig().apiKey, keyToRedact].filter(Boolean);
    for (const apiKey of keysToRedact) {
        userMessage = userMessage.replaceAll(apiKey, "[chave oculta]");
        userMessage = userMessage.replaceAll(encodeURIComponent(apiKey), "[chave oculta]");
    }
    userMessage = userMessage.replace(/[?&]apikey=[^&\s]*/gi, "?apikey=[chave oculta]");

    if (detail && !hostOnly && !invalidKey && !noCredits && responseStatus !== 429 && !responseStatus) {
        userMessage = userMessage.slice(0, 500);
    }
    const error = new Error(userMessage);
    error.code = code;
    error.userMessage = userMessage;
    return error;
}

function isApiError(error) {
    return typeof error?.code === "string" && error.code.startsWith("BRONXYS_");
}

function getUserErrorMessage(error, prefix = "!") {
    if (!isApiError(error)) return null;
    return (error.userMessage || error.message).replaceAll("{prefix}", prefix);
}

function throwIfApiError(payload) {
    if (!payload || typeof payload !== "object" || Buffer.isBuffer(payload)) return payload;
    if (payload.error || payload.erro || payload.success === false) {
        throw createApiError(payload);
    }
    return payload;
}

async function fetchBronxysJson(url, config) {
    try {
        return throwIfApiError(await api.fetchJson(url, config));
    } catch (error) {
        if (isApiError(error)) throw error;
        throw createApiError(error);
    }
}

async function fetchBronxysBuffer(url, config) {
    try {
        const buffer = await api.fetchBuffer(url, config);
        const text = buffer.toString("utf8").trim();
        if (text.startsWith("{") || text.startsWith("[")) {
            try {
                throwIfApiError(JSON.parse(text));
            } catch (error) {
                if (isApiError(error)) throw error;
            }
        }
        return buffer;
    } catch (error) {
        if (isApiError(error)) throw error;
        throw createApiError(error);
    }
}

async function searchYouTube(query) {
    const apiKey = getApiKey();
    const encodedQuery = encodeURIComponent(query);

    return await fetchBronxysJson(
        `${BASE_URL}/pesquisa_ytb?nome=${encodedQuery}&apikey=${apiKey}`
    );
}

async function getYouTubeMetadata(query) {
    const results = await searchYouTube(query);
    if (!Array.isArray(results) || results.length === 0 || !results[0]) {
        throw new Error("[BRONXYS] Nenhum resultado encontrado no YouTube");
    }

    const firstResult = results[0];
    const title = firstResult.titulo || firstResult.title || firstResult.name;
    if (!title) {
        throw new Error("[BRONXYS] A API do YouTube retornou um resultado sem título");
    }

    return {
        ...firstResult,
        titulo: title,
        url: firstResult.url || query
    };
}

function createAudioFilename(title) {
    const safeTitle = String(title || "audio")
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/, "")
        .slice(0, 180);

    return `${safeTitle || "audio"}.mp3`;
}

async function downloadYouTubeAudio(query) {
    const apiKey = getApiKey();
    const cleanQuery = cleanMediaUrl(query);
    const encodedQuery = encodeURIComponent(cleanQuery);

    return await fetchBronxysBuffer(
        `${BASE_URL}/play?nome_url=${encodedQuery}&apikey=${apiKey}`
    );
}

async function downloadYouTubeVideo(query) {
    const apiKey = getApiKey();
    const cleanQuery = cleanMediaUrl(query);
    const encodedQuery = encodeURIComponent(cleanQuery);

    return await fetchBronxysBuffer(
        `${BASE_URL}/play_video?nome_url=${encodedQuery}&apikey=${apiKey}`
    );
}

async function downloadTikTok(url) {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    return await fetchBronxysBuffer(
        `${BASE_URL}/tiktok?url=${encodedUrl}&apikey=${apiKey}`
    );
}

async function downloadInstagram(url) {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    const data = await fetchBronxysJson(
        `${BASE_URL}/instagram?url=${encodedUrl}&apikey=${apiKey}`
    );

    if (!data.msg || !data.msg[0]) {
        throw new Error("[BRONXYS] Nenhuma mídia encontrada no Instagram");
    }

    return await fetchBronxysBuffer(data.msg[0].url);
}

async function downloadSpotify(url) {
    const apiKey = getApiKey();
    const encodedUrl = encodeURIComponent(url);

    return await fetchBronxysBuffer(
        `${BASE_URL}/spotify?url=${encodedUrl}&apikey=${apiKey}`
    );
}

async function downloadTwitter(url, type = "video") {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    const endpoint = type === "audio" ? "twitter_audio" : "twitter_video";

    return await fetchBronxysBuffer(
        `${BASE_URL}/${endpoint}?url=${encodedUrl}&apikey=${apiKey}`
    );
}

async function downloadFacebook(url, type = "video") {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    const endpoint = type === "audio" ? "face_audio" : "face_video";

    return await fetchBronxysBuffer(
        `${BASE_URL}/${endpoint}?url=${encodedUrl}&apikey=${apiKey}`
    );
}

async function downloadKwai(url) {
    const apiKey = getApiKey();
    const cleanUrl = cleanMediaUrl(url);
    const encodedUrl = encodeURIComponent(cleanUrl);

    return await fetchBronxysBuffer(
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

    try {
        return throwIfApiError(await api.postJson(`${BASE_URL}/verify-key`, {
            apikey: apiKey
        }));
    } catch (error) {
        if (isApiError(error)) throw error;
        throw createApiError(error, null, keyToVerify);
    }
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
        const metadata = await getYouTubeMetadata(cleanUrl);
        result = {
            platform,
            type,
            buffer: await downloadYouTubeAudio(cleanUrl),
            mimeType: 'audio/mpeg',
            filename: createAudioFilename(metadata.titulo),
            title: metadata.titulo,
            thumb: metadata.thumb,
            duration: metadata.tempo,
            author: metadata.autor,
            url: metadata.url
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
    getYouTubeMetadata,
    createAudioFilename,
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
    isApiError,
    getUserErrorMessage,
    cleanMediaUrl,
    detectMediaLinkType,
    autodownloadSupportedLink
};