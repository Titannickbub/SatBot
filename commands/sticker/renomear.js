const { addExifToWebp, createStickerBuffer, formatStickerPlaceholders } = require("../../functions/stickerHelper");

function escapeRegex(string) {
    return String(string || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
    name: "renomear",
    aliases: ["rename", "steal", "wm", "rn"],
    category: "sticker",
    platformSupport: {
        whatsapp: "full",
        telegram: "none",
        discord: "none"
    },
    description: `🏷️ Altera o pacote (pack) e o autor de uma figurinha existente sem perder o formato nem a qualidade.

📱 Exclusivo para WhatsApp.
👥 Disponível para qualquer usuário.

📝 Como utilizar:
Responda a uma figurinha com:
{prefix}renomear <pacote> / <autor>

Exemplo:
{prefix}renomear figurinha feita / por titannick

✨ Recursos:
• Suporta quebras de linha tanto no pacote quanto no autor.
• Mantém o formato original da figurinha (estática, animada ou sonora).
• Suporta placeholders dinâmicos:
  - {user} — Nome do usuário
  - {n_user} — Número do usuário
  - {name_bot} — Nome configurado do bot
  - {n_bot} — Número conectado ao bot
  - {namechat} — Número do grupo`,
    usage: "{prefix}renomear <pacote> / <autor>",
    examples: [
        "{prefix}renomear figurinha feita / por titannick",
        "{prefix}rename Pack de {user} / {name_bot}",
        "{prefix}renomear {user} / {namechat}"
    ],

    async execute(message) {
        if (message.platform !== "whatsapp") {
            return message.reply({
                text: "❌ O comando de renomear figurinhas está disponível apenas no WhatsApp."
            });
        }

        let text = "";
        if (typeof message.getArgText === "function") {
            text = message.getArgText(1);
        }
        if (!text && message.text) {
            const prefix = message.prefix || "!";
            const cmd = message.command || "renomear";
            const regex = new RegExp(`^${escapeRegex(prefix)}${escapeRegex(cmd)}\\s*`, "i");
            text = message.text.replace(regex, "");
        }
        if (!text && Array.isArray(message.args) && message.args.length > 0) {
            text = message.args.join(" ");
        }
        text = (text || "").trim();

        if (!text) {
            const p = message.prefix || "!";
            return message.reply({
                text: `🎨 *Como renomear uma figurinha:*\n\n` +
                    `Responda a uma figurinha com:\n` +
                    `\`${p}renomear <pacote> / <autor>\`\n\n` +
                    `*Exemplo:*\n` +
                    `\`${p}renomear figurinha feita / por titannick\`\n\n` +
                    `✨ *Recursos:*\n` +
                    `• Permite quebras de linha no pacote e autor.\n` +
                    `• Mantém o formato original da figurinha.\n` +
                    `• Placeholders: \`{user}\`, \`{n_user}\`, \`{name_bot}\`, \`{n_bot}\`, \`{namechat}\`.`
            });
        }

        const currentMedia = message.media;
        const quotedMedia = message.quoted && message.quoted.media;
        const mediaObj = quotedMedia || currentMedia;

        if (!mediaObj || typeof mediaObj.getBuffer !== "function") {
            const p = message.prefix || "!";
            return message.reply({
                text: `⚠️ Para renomear, responda a uma figurinha com:\n\`${p}renomear ${text}\``
            });
        }

        let packName = "";
        let authorName = "";

        if (text.includes("/") || text.includes("|")) {
            const separator = text.includes("/") ? "/" : "|";
            const parts = text.split(separator);
            packName = parts[0].trim();
            authorName = parts.slice(1).join(separator).trim();
        } else {
            packName = text.trim();
            authorName = "";
        }

        const configFn = message.functions?.config || require("../../functions/config");
        const defaultBotName = configFn.getBotName?.() || "Sat Bot";

        if (!packName) {
            packName = defaultBotName;
        }
        if (!authorName) {
            authorName = defaultBotName;
        }

        const resolvedPack = formatStickerPlaceholders(packName, message, defaultBotName);
        const resolvedAuthor = formatStickerPlaceholders(authorName, message, defaultBotName);

        try {
            await message.react("⏳").catch(() => { });
            const buffer = await mediaObj.getBuffer();

            if (!buffer || buffer.length === 0) {
                await message.react("❌").catch(() => { });
                return message.reply({ text: "❌ Não foi possível baixar a mídia da figurinha." });
            }

            const mimeType = String(mediaObj.mimeType || "").toLowerCase();
            const type = String(mediaObj.type || "").toLowerCase();
            const isWebpSignature = buffer.length >= 12 && buffer.subarray(8, 12).toString("ascii") === "WEBP";
            const isSticker = type === "sticker" || mimeType.includes("webp") || isWebpSignature;

            let stickerToSend = null;

            if (isSticker) {
                // Altera apenas os metadados EXIF sem recodificar a imagem/vídeo, mantendo dimensões, FPS e formato exatos
                stickerToSend = await addExifToWebp(
                    buffer,
                    resolvedPack,
                    resolvedAuthor,
                    "",
                    message
                );
            } else {
                // Caso o usuário responda a uma imagem/vídeo que não seja figurinha, converte aplicando os metadados
                stickerToSend = await createStickerBuffer(buffer, {
                    mimeType: mediaObj.mimeType,
                    type: mediaObj.type,
                    platform: message.platform,
                    mode: "contain",
                    packName: resolvedPack,
                    authorName: resolvedAuthor,
                    addMetadata: true,
                    message
                });
            }

            // Preserva áudio se a figurinha de origem for uma figurinha sonora (audio sticker)
            const qAudioMsg = message.quoted?.raw?.audioMessage ||
                message.raw?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage?.audioMessage ||
                message.raw?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioStickerMessage?.message?.stickerMessage?.audioMessage;

            if (qAudioMsg && typeof message.replyAudioSticker === "function") {
                try {
                    const { getFileBuffer } = require("../../functions/api");
                    const audioBuffer = await getFileBuffer(qAudioMsg, "audio");
                    if (audioBuffer) {
                        const sharp = require("sharp");
                        const metadata = await sharp(stickerToSend, { animated: true, failOn: "none" }).metadata();
                        await message.replyAudioSticker({
                            sticker: stickerToSend,
                            audio: audioBuffer,
                            durationSeconds: qAudioMsg.seconds || 5,
                            waveform: qAudioMsg.waveform,
                            width: metadata.width || 512,
                            height: metadata.pageHeight || metadata.height || 512,
                            isAnimated: (Number(metadata.pages) || 1) > 1
                        });
                        await message.react("✅").catch(() => { });
                        return;
                    }
                } catch (audioErr) {
                    console.warn("[RENOMEAR] Não foi possível reenviar áudio da figurinha sonora:", audioErr.message || audioErr);
                }
            }

            if (typeof message.replySticker === "function") {
                await message.replySticker(stickerToSend);
            } else if (typeof message.reply === "function") {
                await message.reply({ sticker: stickerToSend });
            }

            await message.react("✅").catch(() => { });
        } catch (err) {
            console.error("[RENOMEAR] Erro ao renomear figurinha:", err.message || err);
            await message.react("❌").catch(() => { });
            return message.reply({ text: "❌ Ocorreu um erro ao renomear a figurinha." });
        }
    }
};
