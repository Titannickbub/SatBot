const fs = require("fs");
const path = require("path");
const { fetchBuffer, getFileBuffer } = require("../../../functions/api");
const { resolveTestKey, getSupportedTestKeys, saveTestMedia, loadTestConfig, TESTES_MEDIA_DIR, TESTES_FILE } = require("../../../functions/testeHelper");
const actModule = require("../../diversao/act");

const { detectBufferFormat } = actModule._internals || {};

module.exports = {
    name: "set_teste",
    aliases: ["setteste", "testeset", "teste_edit", "testeedit"],
    category: "system/configurações",
    description: "Administra as mídias dos testes de diversão com a mesma sintaxe do editor do act.",
    usage: "{prefix}set_teste [subcomando] [tipo] [url|imagem anexa]",
    examples: [
        "{prefix}set_teste list",
        "{prefix}set_teste info gay",
        "{prefix}set_teste image gay",
        "{prefix}set_teste image gay https://.../img.gif",
        "{prefix}set_teste clear gay"
    ],

    async execute(message) {
        const owners = message.functions && message.functions.owners;
        if (owners && typeof owners.isOwner === "function" && !owners.isOwner(message)) {
            return message.reply({ text: "❌ Apenas Super Usuários podem configurar imagens de teste." });
        }

        const args = Array.isArray(message.args) ? message.args : [];
        const command = String(args[0] || "").trim().toLowerCase();

        if (!command || ["help", "ajuda"].includes(command)) {
            return message.reply({ text: help(message) });
        }

        if (["list", "ls", "lista"].includes(command)) {
            return message.reply({ text: formatAvailableTests() });
        }

        if (["show", "info", "inspect", "verificar"].includes(command)) {
            const typeArg = String(args[1] || "").trim();
            const resolvedKey = resolveTestKey(typeArg) || null;
            if (!resolvedKey) {
                return message.reply({ text: `❌ Informe o tipo do teste. Exemplo: \`${message.prefix}set_teste info gay\`.` });
            }
            return message.reply({ text: infoForTest(resolvedKey) });
        }

        if (["clear", "remove", "delete", "limpar"].includes(command)) {
            const typeArg = String(args[1] || "").trim();
            const resolvedKey = resolveTestKey(typeArg);
            if (!resolvedKey) {
                return message.reply({ text: `❌ Informe o tipo para limpar. Exemplo: \`${message.prefix}set_teste clear gay\`.` });
            }
            return clearTestMedia(message, resolvedKey);
        }

        if (["image", "media", "set", "add"].includes(command)) {
            const typeArg = String(args[1] || "").trim();
            const resolvedKey = resolveTestKey(typeArg);
            if (!resolvedKey) {
                return message.reply({ text: `❌ Informe o tipo do teste. Exemplo: \`${message.prefix}set_teste image gay\`.` });
            }
            return saveTestFromMessage(message, resolvedKey, args.slice(2));
        }

        const resolvedKey = resolveTestKey(command);
        if (resolvedKey) {
            const legacyAction = String(args[1] || "").trim().toLowerCase();
            if (["clear", "remove", "delete", "limpar"].includes(legacyAction)) {
                return clearTestMedia(message, resolvedKey);
            }
            if (["image", "media", "set", "add"].includes(legacyAction)) {
                return saveTestFromMessage(message, resolvedKey, args.slice(2));
            }
            return saveTestFromMessage(message, resolvedKey, args.slice(1));
        }

        return message.reply({ text: `❌ Tipo inválido. Escolha um destes: ${getSupportedTestKeys().map(item => `\`${item}\``).join(", ")}.\n\n${help(message)}` });
    }
};

async function saveTestFromMessage(message, resolvedKey, extraArgs) {
    try {
        const media = await resolveMediaFromMessage(message, extraArgs);
        if (!media || !media.buffer) {
            return message.reply({ text: "❌ Anexe uma imagem, GIF, vídeo ou envie uma URL para configurar a mídia do teste." });
        }

        const detector = detectBufferFormat ? detectBufferFormat(media.buffer) : { ext: "png", type: "photo", mime: "image/png" };
        const type = media.type || inferMediaType(detector, media.mimeType);
        const fileExt = detector.ext && detector.ext !== "bin" ? detector.ext : (type === "video" ? "mp4" : type === "gif" ? "gif" : "png");
        const outputFile = path.join(TESTES_MEDIA_DIR, `${resolvedKey}.${fileExt}`);

        const currentConfig = loadTestConfig();
        const previous = currentConfig[resolvedKey];
        if (previous?.media?.[0]?.file) {
            const previousPath = path.join(TESTES_MEDIA_DIR, path.basename(previous.media[0].file));
            if (fs.existsSync(previousPath) && previousPath !== outputFile) {
                fs.unlinkSync(previousPath);
            }
        }

        fs.writeFileSync(outputFile, media.buffer);
        saveTestMedia(resolvedKey, {
            type,
            file: `${resolvedKey}.${fileExt}`,
            fileName: `${resolvedKey}.${fileExt}`
        });

        return message.reply({ text: `✅ Mídia salva para o teste *${resolvedKey}*.` });
    } catch (error) {
        console.error("[SET_TESTE] Erro ao salvar mídia:", error);
        return message.reply({ text: "❌ Não foi possível salvar a mídia do teste. Tente novamente com uma imagem, GIF ou vídeo válido." });
    }
}

function clearTestMedia(message, resolvedKey) {
    const config = loadTestConfig();
    const existing = config[resolvedKey];
    if (existing?.media?.[0]?.file) {
        const existingPath = path.join(TESTES_MEDIA_DIR, path.basename(existing.media[0].file));
        if (fs.existsSync(existingPath)) {
            fs.unlinkSync(existingPath);
        }
    }
    delete config[resolvedKey];
    fs.writeFileSync(TESTES_FILE, JSON.stringify(config, null, 4), "utf8");
    return message.reply({ text: `✅ Mídia removida do teste *${resolvedKey}*.` });
}

function infoForTest(resolvedKey) {
    const config = loadTestConfig();
    const entry = config[resolvedKey];
    const fileName = entry?.media?.[0]?.file || null;
    const fileState = fileName && fs.existsSync(path.join(TESTES_MEDIA_DIR, path.basename(fileName))) ? "presente" : "ausente";
    return [
        `📦 *TESTE: ${resolvedKey}*`,
        "",
        `• Arquivo salvo: ${fileName || "nenhum"}`,
        `• Estado: ${fileState}`,
        `• Tipo: ${entry?.media?.[0]?.type || "não configurado"}`
    ].join("\n");
}

function formatAvailableTests() {
    const config = loadTestConfig();
    const lines = ["📋 *TESTES CONFIGURADOS*", ""];
    const items = getSupportedTestKeys();

    for (const item of items) {
        const hasMedia = !!(config[item]?.media?.[0]?.file);
        lines.push(`• \`${item}\` — ${hasMedia ? "mídia salva" : "sem mídia"}`);
    }

    return lines.join("\n");
}

async function resolveMediaFromMessage(message, extraArgs) {
    const explicitValue = (extraArgs || []).join(" ").trim();
    if (explicitValue) {
        if (/^https?:\/\//i.test(explicitValue)) {
            const buffer = await fetchBuffer(explicitValue);
            return { buffer, type: inferUrlType(explicitValue) };
        }

        if (fs.existsSync(path.resolve(process.cwd(), explicitValue))) {
            const buffer = fs.readFileSync(path.resolve(process.cwd(), explicitValue));
            return { buffer, type: inferFromBuffer(buffer) };
        }
    }

    const raw = message.raw || {};

    if (message.platform === "whatsapp") {
        const msg = raw.message || raw;
        const mediaMap = [
            ["imageMessage", "image"],
            ["videoMessage", "video"],
            ["stickerMessage", "sticker"],
            ["documentMessage", "document"]
        ];

        for (const [key, mediaType] of mediaMap) {
            const payload = msg?.[key];
            if (!payload) continue;
            try {
                const buffer = await getFileBuffer(payload, mediaType === "sticker" ? "sticker" : mediaType === "image" ? "image" : mediaType === "video" ? "video" : "document");
                return { buffer, type: mediaType === "sticker" ? "gif" : mediaType === "video" ? "video" : "photo" };
            } catch (error) {
                console.warn("[SET_TESTE] Falha ao baixar mídia do WhatsApp:", error.message || error);
            }
        }
    }

    if (message.platform === "discord") {
        const attachment = raw?.attachments?.first?.();
        if (attachment) {
            const buffer = await fetchBuffer(attachment.url);
            return { buffer, type: attachment.contentType?.startsWith("video/") ? "video" : "photo" };
        }
    }

    if (message.platform === "telegram") {
        const ctxMessage = raw?.message || raw;
        if (ctxMessage?.photo && Array.isArray(ctxMessage.photo) && ctxMessage.photo.length) {
            const file = ctxMessage.photo[ctxMessage.photo.length - 1];
            const fileLink = await raw.telegram.getFileLink(file.file_id);
            const buffer = await fetchBuffer(fileLink.href);
            return { buffer, type: "photo" };
        }

        if (ctxMessage?.animation) {
            const fileLink = await raw.telegram.getFileLink(ctxMessage.animation.file_id);
            const buffer = await fetchBuffer(fileLink.href);
            return { buffer, type: "gif" };
        }

        if (ctxMessage?.video) {
            const fileLink = await raw.telegram.getFileLink(ctxMessage.video.file_id);
            const buffer = await fetchBuffer(fileLink.href);
            return { buffer, type: "video" };
        }
    }

    return null;
}

function inferMediaType(detector, mimeType) {
    if (detector && detector.type === "video") return "video";
    if (detector && detector.isRealGif) return "gif";
    if (String(mimeType || "").startsWith("video/")) return "video";
    if (String(mimeType || "").startsWith("image/gif")) return "gif";
    return "photo";
}

function inferFromBuffer(buffer) {
    if (!Buffer.isBuffer(buffer)) return "photo";
    const detector = detectBufferFormat ? detectBufferFormat(buffer) : null;
    if (detector && detector.isRealGif) return "gif";
    if (detector && detector.type === "video") return "video";
    return "photo";
}

function inferUrlType(url) {
    const lower = String(url || "").toLowerCase();
    if (/\.gif(?:\?|$)/i.test(lower) || lower.includes("gif")) return "gif";
    if (/\.(mp4|mov|mkv|webm)(?:\?|$)/i.test(lower)) return "video";
    return "photo";
}

function help(message) {
    const prefix = message.prefix || "!";
    return [
        "⚙️ *CONFIGURAR TESTES*",
        "",
        `Use: \`${prefix}set_teste [list|info|image|clear] [tipo] [url|imagem anexa]\``,
        "",
        "Subcomandos:",
        `• \`${prefix}set_teste list\` — mostra todos os tipos e se possuem mídia`,
        `• \`${prefix}set_teste info gay\` — exibe o status do teste`,
        `• \`${prefix}set_teste image gay\` — salva uma imagem/video/gif anexada`,
        `• \`${prefix}set_teste clear gay\` — remove a mídia do teste`,
        "",
        "Compatibilidade com sintaxe antiga:",
        `• \`${prefix}set_teste gay\` (anexando imagem/gif/video)`,
        `• \`${prefix}set_teste bonito https://example.com/bonito.gif\``,
        `• \`${prefix}set_teste feio clear\``,
        "",
        `Tipos disponíveis: ${getSupportedTestKeys().map(item => `\`${item}\``).join(", ")}`
    ].join("\n");
}
