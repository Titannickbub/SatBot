const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { isOwner } = require("../../functions/owners");
const { fetchBuffer } = require("../../functions/api");

const ACTIONS_FILE = path.join(__dirname, "act.json");
const MEDIA_DIR = path.join(__dirname, "act_media");
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_ACTIONS = 100;
const MAX_MESSAGES = 50;
const MAX_MEDIA = 30;
const MAX_MESSAGE_LENGTH = 500;
const MEDIA_TYPES = new Set(["photo", "gif", "video"]);
const ACTION_NAME = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,31}$/u;

const DESCRIPTION = `🎭 Administra, cria e inspeciona as ações interativas de roleplay e suas mídias embutidas.

🔐 Disponível apenas para superusuários / donos do bot.

📋 1. Liste todas as ações cadastradas:
{prefix}act_edit list

Exibe todas as ações disponíveis, quantidade de mídias, mensagens e status (ativada/desativada).

➕ 2. Crie uma nova ação interativa:
{prefix}act_edit new <nome_da_ação>
{prefix}act_edit new kiss

💬 3. Adicione frases à ação:
{prefix}act_edit message <ação> <frase>
{prefix}act_edit message kiss {user1} beijou apaixonadamente {user2}!

Variáveis disponíveis para a mensagem:
• {user1} — Usuário que executou o comando
• {user2} — Usuário mencionado ou respondido

🖼️ 4. Adicione mídias (GIF, vídeo MP4 ou imagem):
{prefix}act_edit image <ação> <URL>
{prefix}act_edit image kiss https://exemplo.com/beijo.gif

Você também pode anexar uma mídia ou responder a uma mensagem de imagem/GIF/vídeo com {prefix}act_edit image <ação>. O arquivo será salvo permanentemente no disco local.

🏷️ 5. Adicione um apelido/atalho (alias):
{prefix}act_edit alias <ação> <apelido>
{prefix}act_edit alias kiss beijo

🔍 6. Inspecione detalhes e analise arquivos de mídia:
{prefix}act_edit show <ação>
{prefix}act_edit inspect <ação>

O comando inspect analisa o codec real, se é GIF genuíno ou MP4, além do tamanho em disco. Você também pode usar {prefix}act_edit inspect respondendo diretamente a uma mídia.

🗑️ 7. Remova frases ou mídias:
{prefix}act_edit remove-message <ação> <número>
{prefix}act_edit remove-image <ação> <número>

Consulte a numeração exata dos itens usando {prefix}act_edit show <ação>.

⚡ 8. Ative ou desative uma ação:
{prefix}act_edit enable <ação>
{prefix}act_edit disable <ação>

❌ 9. Exclua uma ação definitivamente:
{prefix}act_edit delete <ação>

Exclui a ação do banco e remove todos os arquivos de mídia associados do disco local.`;

module.exports = {
    name: "act_edit",
    aliases: ["actedit", "act_inspect", "actinspect"],
    category: "system",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },
    description: DESCRIPTION,
    usage: "{prefix}act_edit [subcomando]",
    examples: [
        "{prefix}act_edit list",
        "{prefix}act_edit show kiss",
        "{prefix}act_edit inspect hug",
        "{prefix}act_edit inspect (respondendo a uma mídia)",
        "{prefix}act_edit new kiss",
        "{prefix}act_edit message kiss {user1} beijou {user2}!",
        "{prefix}act_edit image kiss (anexe ou responda a um GIF/imagem)",
        "{prefix}act_edit image kiss https://exemplo.com/beijo.gif",
        "{prefix}act_edit alias kiss beijo",
        "{prefix}act_edit remove-message kiss 1",
        "{prefix}act_edit remove-image kiss 1",
        "{prefix}act_edit enable|disable kiss",
        "{prefix}act_edit delete kiss"
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
                case "inspect":
                case "info":
                case "verificar":
                    return await inspectActionMedia(message, actions, args[1]);
                case "new":
                    return createAction(message, actions, args[1]);
                case "message":
                    return addMessage(message, actions, args[1]);
                case "image":
                case "media":
                    return await addMedia(message, actions, args[1], args[2], args[3]);
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
            console.error("[ACT_EDIT] Erro ao editar ação:", error);
            return message.reply({ text: `❌ ${error.message || "Não foi possível concluir a edição. Confira os dados e tente novamente."}` });
        }
    }
};

function readActions() {
    if (!fs.existsSync(ACTIONS_FILE)) {
        fs.writeFileSync(ACTIONS_FILE, JSON.stringify({}, null, 2), "utf8");
    }
    const parsed = JSON.parse(fs.readFileSync(ACTIONS_FILE, "utf8"));
    validateActions(parsed);
    return parsed;
}

function writeActions(actions) {
    validateActions(actions);
    const serialized = JSON.stringify(actions, null, 2) + "\n";
    if (Buffer.byteLength(serialized, "utf8") > MAX_FILE_SIZE) {
        throw new Error("O arquivo de ações excede o limite de 50 MB.");
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

function detectBufferFormat(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
        return { ext: "bin", mime: "application/octet-stream", type: "unknown", name: "Desconhecido" };
    }
    const header3 = buffer.slice(0, 3).toString("ascii");
    const header6 = buffer.slice(0, 6).toString("ascii");
    if (header3 === "GIF" || header6.startsWith("GIF8")) {
        return { ext: "gif", mime: "image/gif", type: "gif", name: "GIF Clássico (GIF89a/87a)", isRealGif: true };
    }
    const ftyp = buffer.slice(4, 8).toString("ascii");
    if (ftyp === "ftyp" || ftyp === "moov" || buffer.slice(4, 12).toString("ascii").includes("mp4")) {
        return { ext: "mp4", mime: "video/mp4", type: "video", name: "Vídeo MP4 (H.264/AAC)", isMp4: true };
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return { ext: "png", mime: "image/png", type: "photo", name: "Imagem PNG" };
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return { ext: "jpg", mime: "image/jpeg", type: "photo", name: "Imagem JPEG" };
    }
    if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") {
        return { ext: "webp", mime: "image/webp", type: "photo", name: "Imagem WebP" };
    }
    return { ext: "bin", mime: "application/octet-stream", type: "unknown", name: "Binário Genérico" };
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
    const hasFile = typeof media.file === "string" && media.file.trim().length > 0;
    const hasBase64 = typeof media.base64 === "string" && media.base64.trim().length > 0;
    const hasData = typeof media.data === "string" && media.data.trim().length > 0;
    const hasUrl = typeof media.url === "string" && media.url.trim().length > 0;

    if (!hasFile && !hasBase64 && !hasData && !hasUrl) {
        throw new Error("A mídia precisa conter o nome do arquivo local ou uma URL/caminho.");
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
    if (!value || !String(value).trim()) throw new Error("Informe o nome da ação. Exemplo: !act_edit show kiss");
    const resolved = resolveAction(actions, value);
    if (!resolved) throw new Error(`Ação "${value}" não encontrada. Use !act_edit list para ver as ações cadastradas.`);
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
        const mediaCount = Array.isArray(action.media) ? action.media.length : 0;
        return `• ${key}${aliases} — ${state} (${mediaCount} mídias)`;
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
        ? action.media.map((media, index) => {
            const fileName = media.file || media.fileName || (media.url ? path.basename(media.url) : "mídia");
            let sizeKb = "";
            if (media.file) {
                const filePath = path.join(MEDIA_DIR, path.basename(media.file));
                if (fs.existsSync(filePath)) {
                    sizeKb = ` (~${(fs.statSync(filePath).size / 1024).toFixed(1)} KB)`;
                }
            } else if (media.base64) {
                sizeKb = ` (~${Math.round((media.base64.length * 0.75) / 1024)} KB)`;
            }
            return `${index + 1}. [${media.type}] ${fileName}${sizeKb}`;
        })
        : ["(nenhuma)"]));
    return message.reply({ text: lines.join("\n") });
}

async function inspectActionMedia(message, actions, value) {
    // 1. Se informou o nome da ação: inspeciona as mídias salvas da ação
    if (value && String(value).trim()) {
        const { key, action } = ensureAction(actions, value);
        if (!Array.isArray(action.media) || !action.media.length) {
            return message.reply({ text: `🔍 A ação *"${key}"* não possui mídias cadastradas.` });
        }

        const lines = [`🔍 *INSPEÇÃO DE MÍDIAS DA AÇÃO "${key.toUpperCase()}"*`, ""];
        action.media.forEach((media, idx) => {
            let buffer = null;
            let fileRelPath = media.file || (media.url ? path.basename(media.url) : "mídia embutida");

            if (media.file) {
                const candidatePaths = [
                    path.join(MEDIA_DIR, path.basename(media.file)),
                    path.resolve(__dirname, media.file)
                ];
                for (const p of candidatePaths) {
                    if (fs.existsSync(p)) {
                        buffer = fs.readFileSync(p);
                        fileRelPath = `act_media/${path.basename(p)}`;
                        break;
                    }
                }
            } else if (media.base64) {
                buffer = Buffer.from(media.base64, "base64");
            } else if (media.data) {
                const b64 = media.data.includes(",") ? media.data.split(",")[1] : media.data;
                buffer = Buffer.from(b64, "base64");
            }
            const detected = buffer ? detectBufferFormat(buffer) : { name: "URL Externa", ext: "url", mime: media.mimeType || "desconhecido" };
            const sizeKb = buffer ? (buffer.length / 1024).toFixed(1) : "N/A";
            const headerHex = buffer ? buffer.slice(0, 8).toString("hex") : "N/A";

            lines.push(`*Mídia #${idx + 1}:*`);
            lines.push(`  • *Arquivo:* \`${fileRelPath}\``);
            lines.push(`  • *Tipo cadastrado:* \`${media.type}\``);
            lines.push(`  • *Formato real detectado:* *${detected.name}* (\`.${detected.ext}\`)`);
            lines.push(`  • *MIME Type:* \`${detected.mime || media.mimeType}\``);
            lines.push(`  • *Tamanho:* ${sizeKb} KB`);
            lines.push(`  • *Magic Bytes (HEX):* \`${headerHex}\``);
            if (detected.isMp4 || detected.ext === "gif" || media.type === "gif") {
                lines.push(`  • ℹ️ *Nota WhatsApp:* Enviado como GIF em reprodução contínua em loop (\`gifPlayback: true\`) com legenda.`);
            }
            lines.push("");
        });
        return message.reply({ text: lines.join("\n") });
    }

    // 2. Se não informou ação mas respondeu/anexou mídia: inspeciona a mídia da mensagem
    const targetMedia = message.media || message.quoted?.media;
    let targetUrl = null;
    if (message.quoted?.text) {
        const match = message.quoted.text.match(/https?:\/\/[^\s]+/i);
        if (match) targetUrl = match[0];
    }
    if (!targetUrl && message.text) {
        const textArgs = (message.args || []).slice(1).join(" ");
        const match = textArgs.match(/https?:\/\/[^\s]+/i);
        if (match) targetUrl = match[0];
    }

    let buffer = null;
    let sourceDesc = "";

    if (targetUrl) {
        sourceDesc = `URL: ${targetUrl}`;
        const resp = await axios.get(targetUrl, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        buffer = Buffer.from(resp.data);
    } else if (targetMedia && typeof targetMedia.getBuffer === "function") {
        sourceDesc = `Anexo/Resposta (${targetMedia.fileName || "mídia"})`;
        buffer = await targetMedia.getBuffer();
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
        return message.reply({
            text: "🔍 *INSPEÇÃO DE MÍDIA*\n\nUse:\n• `!act_edit inspect <ação>` para inspecionar as mídias salvas de uma ação.\n• `!act_edit inspect` respondendo a uma mensagem com mídia ou link para analisar o arquivo antes de salvar."
        });
    }

    const detected = detectBufferFormat(buffer);
    const sizeKb = (buffer.length / 1024).toFixed(1);
    const headerHex = buffer.slice(0, 8).toString("hex");

    const lines = [
        "🔍 *INSPEÇÃO DA MÍDIA ENVIADA/RESPONDIDA*",
        "",
        `• *Origem:* ${sourceDesc}`,
        `• *Formato real detectado:* *${detected.name}* (\`.${detected.ext}\`)`,
        `• *MIME Type:* \`${detected.mime}\``,
        `• *Tamanho:* ${sizeKb} KB`,
        `• *Magic Bytes (HEX):* \`${headerHex}\``,
        "",
        `• *Sugestão de uso:* \`!act_edit image <ação>\``
    ];

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

async function addMedia(message, actions, value, url, explicitType) {
    const { key, action } = ensureAction(actions, value);
    if (action.media.length >= MAX_MEDIA) throw new Error(`O limite é de ${MAX_MEDIA} mídias por ação.`);

    let buffer;
    let mimeType = "";
    let detectedFileName = "";

    let targetUrl = url;
    if (!targetUrl && message.quoted?.text) {
        const urlMatch = message.quoted.text.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
            targetUrl = urlMatch[0];
        }
    }
    if (!targetUrl && message.text) {
        const textArgs = (message.args || []).slice(2).join(" ");
        const urlMatch = textArgs.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
            targetUrl = urlMatch[0];
        }
    }

    if (targetUrl && typeof targetUrl === "string" && targetUrl.trim()) {
        const rawUrl = targetUrl.trim();
        if (/^https?:\/\//i.test(rawUrl)) {
            const response = await axios.get(rawUrl, {
                responseType: "arraybuffer",
                timeout: 30000,
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
            });
            buffer = Buffer.from(response.data);
            mimeType = String(response.headers["content-type"] || "").toLowerCase();
            const urlPath = rawUrl.split(/[?#]/)[0];
            detectedFileName = path.basename(urlPath);
        } else {
            const localPath = path.isAbsolute(rawUrl) ? rawUrl : path.resolve(process.cwd(), rawUrl);
            if (!fs.existsSync(localPath)) throw new Error("Arquivo local ou URL não encontrada.");
            buffer = fs.readFileSync(localPath);
            detectedFileName = path.basename(localPath);
        }
    } else {
        const targetMedia = message.media || message.quoted?.media;
        if (!targetMedia || typeof targetMedia.getBuffer !== "function") {
            throw new Error("Envie uma URL ou anexe/responda a uma imagem, GIF ou vídeo.");
        }
        buffer = await targetMedia.getBuffer();
        if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("Não foi possível processar o buffer da mídia.");
        mimeType = String(targetMedia.mimeType || "").toLowerCase();
        detectedFileName = targetMedia.fileName || "";
    }

    // Detecção real pelos bytes do arquivo
    const detectedFormat = detectBufferFormat(buffer);
    const lowerName = (detectedFileName || "").toLowerCase();
    let type = "photo";

    if (explicitType && MEDIA_TYPES.has(String(explicitType).toLowerCase())) {
        type = String(explicitType).toLowerCase();
    } else if (detectedFormat.type === "gif" || detectedFormat.type === "video" || detectedFormat.isMp4 || detectedFormat.isRealGif || mimeType.includes("gif") || mimeType.startsWith("video/") || lowerName.endsWith(".gif") || /\.(mp4|webm|mov|avi)$/i.test(lowerName) || lowerName.includes("tenor") || lowerName.includes("giphy")) {
        type = "gif";
    }

    mimeType = detectedFormat.mime || mimeType || (type === "gif" ? "image/gif" : (type === "video" ? "video/mp4" : "image/png"));
    const ext = `.${detectedFormat.ext !== "bin" ? detectedFormat.ext : (type === "gif" ? "gif" : (type === "video" ? "mp4" : "png"))}`;
    const safeFileName = `${key}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;

    if (!fs.existsSync(MEDIA_DIR)) {
        fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }

    const targetFilePath = path.join(MEDIA_DIR, safeFileName);
    fs.writeFileSync(targetFilePath, buffer);

    const mediaObj = {
        type,
        file: safeFileName
    };

    action.media.push(mediaObj);
    return persist(message, actions, `Mídia salva em "act_media/${safeFileName}" para "${key}". Formato detectado: ${detectedFormat.name} (${(buffer.length / 1024).toFixed(1)} KB).`);
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
    const removed = action[field].splice(index - 1, 1)[0];

    if (field === "media" && removed) {
        const fileToDelete = removed.file || (removed.url && !/^https?:\/\//i.test(removed.url) ? path.basename(removed.url) : null);
        if (fileToDelete) {
            const filePath = path.join(MEDIA_DIR, path.basename(fileToDelete));
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (_) {}
            }
        }
    }

    return persist(message, actions, `${field === "messages" ? "Frase" : "Mídia"} removida da ação "${key}".`);
}

function setEnabled(message, actions, value, enabled) {
    const { key, action } = ensureAction(actions, value);
    action.enabled = enabled;
    return persist(message, actions, `Ação "${key}" ${enabled ? "ativada" : "desativada"}.`);
}

function deleteAction(message, actions, value) {
    const { key, action } = ensureAction(actions, value);
    if (Array.isArray(action.media)) {
        action.media.forEach(media => {
            const fileToDelete = media.file || (media.url && !/^https?:\/\//i.test(media.url) ? path.basename(media.url) : null);
            if (fileToDelete) {
                const filePath = path.join(MEDIA_DIR, path.basename(fileToDelete));
                if (fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch (_) {}
                }
            }
        });
    }
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
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports._internals = {
    readActions,
    writeActions,
    validateActions,
    resolveAction,
    detectBufferFormat
};
