const fs = require('fs');
const path = require('path');

const DICTIONARY_FILE = path.join(__dirname, '..', 'settings', 'discord_emojis.json');

// Regex para capturar emojis customizados padrão do Discord: <:name:id> ou <a:name:id>
const DISCORD_EMOJI_REGEX = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/gi;
const STANDALONE_EMOJI_REGEX = /^\s*<(a)?:([a-zA-Z0-9_]+):(\d+)>\s*$/i;

// Regex para capturar emojis do Vencord / FakeNitro (markdown links para CDN do Discord)
// Exemplo: [NaoSmile](https://cdn.discordapp.com/emojis/845390820705697843.webp?size=48&animated=true&name=NaoSmile&lossless=true)
const VENCORD_EMOJI_REGEX = /\[([a-zA-Z0-9_]+)\]\((https?:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/emojis\/(\d+)\.[a-zA-Z0-9]+(?:\?[^\s)]*)?)\)/gi;
const STANDALONE_VENCORD_REGEX = /^\s*\[([a-zA-Z0-9_]+)\]\((https?:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/emojis\/(\d+)\.[a-zA-Z0-9]+(?:\?[^\s)]*)?)\)\s*$/i;

/**
 * Carrega o dicionário de emojis do arquivo settings/discord_emojis.json
 */
function loadDictionary() {
    if (!fs.existsSync(DICTIONARY_FILE)) {
        const defaultDict = {};
        try {
            const dir = path.dirname(DICTIONARY_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(DICTIONARY_FILE, JSON.stringify(defaultDict, null, 4), 'utf8');
        } catch (err) {
            console.error('[DISCORD_EMOJI] Erro ao criar arquivo de dicionário:', err);
        }
        return defaultDict;
    }

    try {
        const content = fs.readFileSync(DICTIONARY_FILE, 'utf8');
        return JSON.parse(content || '{}');
    } catch (err) {
        console.error('[DISCORD_EMOJI] Erro ao ler dicionário de emojis:', err);
        return {};
    }
}

/**
 * Salva o dicionário de emojis no arquivo settings/discord_emojis.json
 */
function saveDictionary(dict) {
    try {
        const dir = path.dirname(DICTIONARY_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DICTIONARY_FILE, JSON.stringify(dict, null, 4), 'utf8');
        return true;
    } catch (err) {
        console.error('[DISCORD_EMOJI] Erro ao salvar dicionário de emojis:', err);
        return false;
    }
}

/**
 * Define a tradução de um emoji (por ID ou Nome) para um emoji padrão unicode.
 */
function setEmojiMapping(key, unicodeEmoji) {
    if (!key || !unicodeEmoji) return false;
    const dict = loadDictionary();
    dict[String(key).trim()] = String(unicodeEmoji).trim();
    return saveDictionary(dict);
}

/**
 * Remove o mapeamento de um emoji do dicionário.
 */
function removeEmojiMapping(key) {
    if (!key) return false;
    const dict = loadDictionary();
    const cleanKey = String(key).trim();
    if (cleanKey in dict) {
        delete dict[cleanKey];
        return saveDictionary(dict);
    }
    return false;
}

/**
 * Busca a tradução de um emoji no dicionário.
 */
function getEmojiMapping(key) {
    if (!key) return null;
    const dict = loadDictionary();
    return dict[String(key).trim()] || null;
}

/**
 * Retorna a URL da imagem do emoji customizado no CDN do Discord.
 */
function getEmojiUrl(id, isAnimated = false) {
    const ext = isAnimated ? 'gif' : 'png';
    return `https://cdn.discordapp.com/emojis/${id}.${ext}`;
}

/**
 * Verifica se o texto é exclusivamente um emoji customizado do Discord ou Vencord sozinho.
 */
function isStandaloneDiscordEmoji(text) {
    if (!text || typeof text !== 'string') return { isStandalone: false };
    const trimmed = text.trim();

    // 1. Verifica formato padrão Discord: <:name:id> ou <a:name:id>
    const matchStandard = trimmed.match(STANDALONE_EMOJI_REGEX);
    if (matchStandard) {
        const isAnimated = !!matchStandard[1];
        const name = matchStandard[2];
        const id = matchStandard[3];

        return {
            isStandalone: true,
            isAnimated,
            name,
            id,
            url: getEmojiUrl(id, isAnimated)
        };
    }

    // 2. Verifica formato Vencord / FakeNitro: [Name](https://cdn.discordapp.com/emojis/ID...)
    const matchVencord = trimmed.match(STANDALONE_VENCORD_REGEX);
    if (matchVencord) {
        const name = matchVencord[1];
        const rawUrl = matchVencord[2];
        const id = matchVencord[3];
        const isAnimated = rawUrl.includes('animated=true') || rawUrl.endsWith('.gif');

        return {
            isStandalone: true,
            isAnimated,
            name,
            id,
            url: rawUrl
        };
    }

    return { isStandalone: false };
}

/**
 * Processa um texto substituindo emojis do Discord (Standard e Vencord).
 * - Se for um emoji customizado sozinho na mensagem, retorna isStandalone: true e a URL da imagem.
 * - Se for um texto misturado, substitui emojis mapeados pelo emoji padrão ou por ⚠️ caso não haja tradução.
 */
function processDiscordEmojis(text) {
    if (!text || typeof text !== 'string') {
        return { isStandalone: false, text: text || '' };
    }

    // 1. Caso seja um emoji personalizado sozinho na mensagem (Standard ou Vencord)
    const standalone = isStandaloneDiscordEmoji(text);
    if (standalone.isStandalone) {
        const dict = loadDictionary();
        const mapped = dict[standalone.id] || dict[standalone.name];

        return {
            isStandalone: true,
            url: standalone.url,
            id: standalone.id,
            name: standalone.name,
            isAnimated: standalone.isAnimated,
            mappedEmoji: mapped || null
        };
    }

    // 2. Texto misturado ou com outros caracteres
    const dict = loadDictionary();
    let hasReplaced = false;

    // Primeiro substitui os emojis do Vencord [Name](https://cdn.discordapp.com/emojis/ID...)
    let processedText = text.replace(VENCORD_EMOJI_REGEX, (fullMatch, name, rawUrl, id) => {
        hasReplaced = true;
        const mapped = dict[id] || dict[name];
        if (mapped) {
            return mapped;
        }
        return '⚠️';
    });

    // Depois substitui os emojis do Discord padrão <:name:id> ou <a:name:id>
    processedText = processedText.replace(DISCORD_EMOJI_REGEX, (fullMatch, anim, name, id) => {
        hasReplaced = true;
        const mapped = dict[id] || dict[name];
        if (mapped) {
            return mapped;
        }
        return '⚠️';
    });

    return {
        isStandalone: false,
        text: processedText,
        hasReplacedEmojis: hasReplaced
    };
}

module.exports = {
    loadDictionary,
    saveDictionary,
    setEmojiMapping,
    removeEmojiMapping,
    getEmojiMapping,
    getEmojiUrl,
    isStandaloneDiscordEmoji,
    processDiscordEmojis
};
