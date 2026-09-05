const fs = require("fs");
const path = require("path");
const { isOwner } = require("../../functions/owners");
const { storeMedia } = require("../../functions/welcomeHelper");

const ACTIONS_FILE = path.join(__dirname, "act.json");
const MAX_FILE_SIZE = 256 * 1024;
const MAX_ACTIONS = 100;
const MAX_MESSAGES = 50;
const MAX_MEDIA = 20;
const MAX_MESSAGE_LENGTH = 500;
const MEDIA_TYPES = new Set(["photo", "gif", "video"]);
const ACTION_NAME = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,31}$/u;

module.exports = {
    name: "act_edit",
    aliases: ["actedit"],
    category: "diversão",
    description: "Administra as ações interativas. Uso exclusivo de Super Usuários.",
    usage: "{prefix}act_edit <list|show|new|message|image|alias|remove-message|remove-image|enable|disable|delete> ...",
    examples: [
        "{prefix}act_edit list",
        "{prefix}act_edit new kiss",
        "{prefix}act_edit message kiss {user1} beijou {user2}!",
        "{prefix}act_edit image kiss https://exemplo.com/beijo.gif"
    ],
    info(message) {
        return help(message);
    },

    async execute(message) {
        if (!(message.sender?.isOwner || isOwner(message))) {
            return message.reply({ text: "❌ Apenas Super Usuários podem administrar as ações." });
        }

        let actions;
        try {
            actions = readActions();
        } catch (error) {
            console.error("[ACT_EDIT] Não foi possível ler act.json:", error);
            return message.reply({ text: "❌ O arquivo de ações está inválido ou indisponível." });
        }

        const args = message.args || [];
        const operation = String(args[0] || "help").toLowerCase();

        try {
            switch (operation) {
                case "list":
                    return message.reply({ text: formatList(actions) });
                case "show":
                    return showAction(message, actions, args[1]);
                case "new":
                    return createAction(message, actions, args[1]);
                case "message":
                    return addMessage(message, actions, args[1]);
                case "image":
                case "media":
                    return addMedia(message, actions, args[1], args[2]);
                case "alias":
                    return addAlias(message, actions, args[1], args[2]);
                case "remove-message":
                    return removeItem(message, actions, args[1], args[2], "messages");
                case "remove-image":
                case "remove-media":
                    return removeItem(message, actions, args[1], args[2], "media");
                case "enable":
                case "disable":
                    return setEnabled(message, actions, args[1], operation === "enable");
                case "delete":
                    return deleteAction(message, actions, args[1]);
                default:
                    return message.reply({ text: help(message) });
            }
        } catch (error) {
            console.error("[ACT_EDIT] Erro:", error);
            console.error("[ACT_EDIT] Erro ao editar ação:", error);
            return message.reply({ text: "❌ Não foi possível concluir a edição. Confira os dados e tente novamente." });
        }
    }
};

function readActions() {
    const parsed = JSON.parse(fs.readFileSync(ACTIONS_FILE, "utf8"));
    validateActions(parsed);
    return parsed;
}

function writeActions(actions) {
    validateActions(actions);
    const serialized = JSON.stringify(actions, null, 2) + "\n";
    if (Buffer.byteLength(serialized, "utf8") > MAX_FILE_SIZE) {
        throw new Error("O arquivo de ações excede o limite de 256 KB.");
    }

    const temporaryPath = `${ACTIONS_FILE}.${process.pid}.${Date.now()}.tmp`;
    let descriptor = null;
    try {
        descriptor = fs.openSync(temporaryPath, "w");
        fs.writeFileSync(descriptor, serialized, "utf8");
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = null;
        fs.renameSync(temporaryPath, ACTIONS_FILE);
    } catch (error) {
        if (descriptor !== null) {
            try { fs.closeSync(descriptor); } catch (_) { /* preserva o erro original */ }
        }
        try { if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath); } catch (_) { /* limpeza best effort */ }
        throw error;
    }
}

function validateActions(actions) {
    if (!actions || typeof actions !== "object" || Array.isArray(actions)) {
        throw new Error("act.json precisa conter um objeto de ações.");
    }
    const names = new Set();
    const keys = Object.keys(actions);
    if (keys.length > MAX_ACTIONS) throw new Error(`O limite é de ${MAX_ACTIONS} ações.`);

    for (const key of keys) {
        if (!isValidActionName(key) || isReservedName(key)) {
            throw new Error(`Nome de ação inválido: ${key}`);
        }
        if (names.has(key.toLowerCase())) throw new Error(`Ação duplicada: ${key}`);
        names.add(key.toLowerCase());

        const action = actions[key];
        if (!action || typeof action !== "object" || Array.isArray(action)) {
            throw new Error(`Configuração inválida para a ação ${key}.`);
        }
        if (action.enabled !== undefined && typeof action.enabled !== "boolean") {
            throw new Error(`enabled inválido para a ação ${key}.`);
        }
        if (!Array.isArray(action.aliases)) action.aliases = [];
        if (!Array.isArray(action.messages)) action.messages = [];
        if (!Array.isArray(action.media)) action.media = [];
        if (action.aliases.length > 10) throw new Error(`A ação ${key} possui aliases demais.`);
        if (action.messages.length > MAX_MESSAGES) throw new Error(`A ação ${key} possui frases demais.`);
        if (action.media.length > MAX_MEDIA) throw new Error(`A ação ${key} possui mídias demais.`);

        for (const alias of action.aliases) {
            if (!isValidActionName(alias) || isReservedName(alias)) {
                throw new Error(`Alias inválido na ação ${key}.`);
            }
            if (names.has(String(alias).toLowerCase())) {
                throw new Error(`Nome ou alias duplicado: ${alias}`);
            }
            names.add(String(alias).toLowerCase());
        }
        for (const text of action.messages) {
            if (typeof text !== "string" || !text.trim() || text.length > MAX_MESSAGE_LENGTH) {
                throw new Error(`Frase inválida na ação ${key}.`);
            }
        }
        for (const media of action.media) validateMedia(media);
    }
}

function validateMedia(media) {
    if (!media || typeof media !== "object" || !MEDIA_TYPES.has(String(media.type || "").toLowerCase())) {
        throw new Error("Tipo de mídia inválido. Use photo, gif ou video.");
    }
    if (typeof media.url !== "string" || !media.url.trim() || media.url.length > 2048) {
        throw new Error("URL/caminho de mídia inválido.");
    }
    if (!/^https?:\/\//i.test(media.url)) {
        const localPath = path.isAbsolute(media.url) ? media.url : path.resolve(process.cwd(), media.url);
        const isTelegramFileId = media.storageProvider === "telegram" &&
            /^[A-Za-z0-9_:/.\\-]+$/.test(media.url);
        if (!fs.existsSync(localPath) && !isTelegramFileId) {
            throw new Error(`Arquivo de mídia não encontrado: ${media.url}`);
        }
    }
    if (media.fileName !== undefined && (typeof media.fileName !== "string" || media.fileName.length > 255)) {
        throw new Error("Nome de arquivo de mídia inválido.");
    }
}

function resolveAction(actions, value) {
    const name = String(value || "").trim().toLowerCase();
    if (!name) return null;
    const key = Object.keys(actions).find(candidate =>
        candidate.toLowerCase() === name ||
        actions[candidate].aliases.some(alias => String(alias).toLowerCase() === name)
    );
    return key ? { key, action: actions[key] } : null;
}

function ensureAction(actions, value) {
    const resolved = resolveAction(actions, value);
    if (!resolved) throw new Error(`Ação não encontrada: ${value || "(vazio)"}`);
    return resolved;
}

function persist(message, actions, text) {
    writeActions(actions);
    return message.reply({ text: `✅ ${text}` });
}

function formatList(actions) {
    const keys = Object.keys(actions);
    if (!keys.length) return "📋 Nenhuma ação cadastrada.";
    return "📋 Ações cadastradas:\n" + keys.map(key => {
        const action = actions[key];
        const state = action.enabled === false ? "🔴 desativada" : "🟢 ativa";
        const aliases = action.aliases.length ? ` (${action.aliases.join(", ")})` : "";
        return `• ${key}${aliases} — ${state}`;
    }).join("\n");
}

function showAction(message, actions, value) {
    const { key, action } = ensureAction(actions, value);
    const lines = [
        `🎭 ${key} — ${action.enabled === false ? "desativada" : "ativa"}`,
        `Aliases: ${action.aliases.length ? action.aliases.join(", ") : "nenhum"}`,
        "",
        "Frases:"
    ];
    lines.push(...(action.messages.length
        ? action.messages.map((text, index) => `${index + 1}. ${text}`)
        : ["(nenhuma)"]));
    lines.push("", "Mídias:");
    lines.push(...(action.media.length
        ? action.media.map((media, index) => `${index + 1}. [${media.type}] ${media.url}`)
        : ["(nenhuma)"]));
    return message.reply({ text: lines.join("\n") });
}

function createAction(message, actions, value) {
    const name = normalizeName(value);
    if (Object.keys(actions).length >= MAX_ACTIONS) throw new Error(`O limite é de ${MAX_ACTIONS} ações.`);
    if (resolveAction(actions, name)) throw new Error(`Ação ou alias já existe: ${name}`);
    actions[name] = { enabled: true, aliases: [], messages: [], media: [] };
    return persist(message, actions, `Ação "${name}" criada.`);
}

function addMessage(message, actions, value) {
    const { key, action } = ensureAction(actions, value);
    const text = typeof message.getArgText === "function"
        ? message.getArgText(2).trim()
        : (message.args || []).slice(2).join(" ").trim();
    if (!text) throw new Error("Informe uma frase.");
    if (text.length > MAX_MESSAGE_LENGTH) throw new Error(`A frase deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
    if (action.messages.length >= MAX_MESSAGES) throw new Error(`O limite é de ${MAX_MESSAGES} frases por ação.`);
    action.messages.push(text);
    return persist(message, actions, `Frase adicionada à ação "${key}".`);
}

async function addMedia(message, actions, value, url) {
    const { key, action } = ensureAction(actions, value);
    if (action.media.length >= MAX_MEDIA) throw new Error(`O limite é de ${MAX_MEDIA} mídias por ação.`);
    let media;
    if (url) {
        media = createUrlMedia(url);
    } else {
        const targetMedia = message.media || message.quoted?.media;
        if (!targetMedia || typeof targetMedia.getBuffer !== "function") {
            throw new Error("Informe uma URL pública ou anexe/responda a uma imagem, GIF ou vídeo.");
        }
        const sourceType = String(targetMedia.type || "").toLowerCase();
        const mime = String(targetMedia.mimeType || "").toLowerCase();
        if (!["image", "video"].includes(sourceType) && !mime.startsWith("image/") && !mime.startsWith("video/")) {
            throw new Error("A mídia precisa ser uma imagem, GIF ou vídeo.");
        }
        const buffer = await targetMedia.getBuffer();
        if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("Não foi possível baixar a mídia.");
        const type = mime.includes("gif") || String(targetMedia.fileName || "").toLowerCase().endsWith(".gif")
            ? "gif"
            : (sourceType === "video" || mime.startsWith("video/") ? "video" : "photo");
        const stored = await storeMedia(message.platform, message, buffer, targetMedia.fileName || `act_${type}`, targetMedia.mimeType || "image/png");
        media = {
            url: stored.url,
            type: type === "photo" ? "photo" : type,
            fileName: stored.fileName || targetMedia.fileName || undefined,
            storageProvider: stored.storageProvider || undefined
        };
    }
    action.media.push(media);
    return persist(message, actions, `Mídia adicionada à ação "${key}".`);
}

function createUrlMedia(url) {
    const value = String(url).trim();
    if (!/^https?:\/\//i.test(value)) {
        const localPath = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
        if (!fs.existsSync(localPath)) throw new Error("A mídia precisa ser uma URL http(s) ou um arquivo local existente.");
    }
    const lower = value.toLowerCase().split(/[?#]/)[0];
    const type = /\.(gif)$/i.test(lower)
        ? "gif"
        : /\.(mp4|webm|mov|avi)$/i.test(lower)
            ? "video"
            : "photo";
    return { url: value, type, fileName: path.basename(lower) || undefined };
}

function addAlias(message, actions, value, aliasValue) {
    const { key, action } = ensureAction(actions, value);
    const alias = normalizeName(aliasValue);
    if (action.aliases.some(item => String(item).toLowerCase() === alias.toLowerCase())) {
        throw new Error(`Alias já existe na ação "${key}".`);
    }
    if (resolveAction(actions, alias)) throw new Error(`Nome ou alias já existe: ${alias}`);
    if (action.aliases.length >= 10) throw new Error("O limite é de 10 aliases por ação.");
    action.aliases.push(alias);
    return persist(message, actions, `Alias "${alias}" adicionado à ação "${key}".`);
}

function removeItem(message, actions, value, indexValue, field) {
    const { key, action } = ensureAction(actions, value);
    const index = parseIndex(indexValue, action[field].length);
    action[field].splice(index - 1, 1);
    return persist(message, actions, `${field === "messages" ? "Frase" : "Mídia"} removida da ação "${key}".`);
}

function setEnabled(message, actions, value, enabled) {
    const { key, action } = ensureAction(actions, value);
    action.enabled = enabled;
    return persist(message, actions, `Ação "${key}" ${enabled ? "ativada" : "desativada"}.`);
}

function deleteAction(message, actions, value) {
    const { key } = ensureAction(actions, value);
    delete actions[key];
    return persist(message, actions, `Ação "${key}" excluída.`);
}

function normalizeName(value) {
    const name = String(value || "").trim().toLowerCase();
    if (!isValidActionName(name) || isReservedName(name)) throw new Error("Nome deve conter letras, números, _ ou - (até 32 caracteres).");
    return name;
}

function parseIndex(value, length) {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 1 || index > length) {
        throw new Error(`Índice inválido. Use um número entre 1 e ${length}.`);
    }
    return index;
}

function isValidActionName(value) {
    return typeof value === "string" && ACTION_NAME.test(value);
}

function isReservedName(value) {
    return ["constructor", "prototype", "__proto__"].includes(String(value).toLowerCase());
}

function help(message) {
    const prefix = message.prefix || "!";
    return [
        "🎭 Gerenciador de ações (exclusivo SU)",
        `${prefix}act_edit list`,
        `${prefix}act_edit show <ação>`,
        `${prefix}act_edit new <ação>`,
        `${prefix}act_edit message <ação> <frase>`,
        `${prefix}act_edit image <ação> <URL>`,
        `${prefix}act_edit image <ação> (anexo ou resposta)`,
        `${prefix}act_edit alias <ação> <alias>`,
        `${prefix}act_edit remove-message <ação> <índice>`,
        `${prefix}act_edit remove-image <ação> <índice>`,
        `${prefix}act_edit enable|disable <ação>`,
        `${prefix}act_edit delete <ação>`
    ].join("\n");
}

module.exports._internals = {
    readActions,
    writeActions,
    validateActions,
    resolveAction,
    createUrlMedia
};
