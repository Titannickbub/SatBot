const sharp = require("sharp");
const { PermissionFlagsBits } = require("discord.js");
const { fetchBuffer } = require("../../functions/api");
const { isOwner } = require("../../functions/owners");
const path = require("path");

function sanitizeStickerName(inputName) {
    let name = String(inputName || "").trim().replace(/[^a-zA-Z0-9_\-\s]/g, " ").replace(/\s+/g, " ");
    if (name.length < 2) {
        name = `figurinha_${Date.now().toString().slice(-4)}`;
    }
    return name.slice(0, 30);
}

module.exports = {
    name: "dsticker",
    aliases: [
        "ds", "dfig", "dfigurinha",
        "fdsticker", "fds", "fdfig", "fdfigurinha",
        "rdsticker", "rds", "rdfig", "rdfigurinha"
    ],
    category: "sticker",
    platformSupport: {
        discord: "full",
        telegram: "none",
        whatsapp: "none"
    },
    description: "Cria uma figurinha (sticker) personalizada no servidor do Discord a partir de fotos, GIFs, vídeos, emojis de outros servidores ou figurinhas do Vencord.",
    usage: "{prefix}dsticker <nome> [imagem/emoji/link]",
    examples: [
        "{prefix}dsticker minha_figurinha (respondendo a uma imagem ou na legenda)",
        "{prefix}dsticker sticker_gato <:custom_emoji:1234567890>",
        "{prefix}fdsticker figurinha_esticada (esticar mídia 512x512)",
        "{prefix}rdsticker figurinha_recortada (recortar quadrado no centro)"
    ],

    async execute(message) {
        if (message.platform !== "discord") {
            return message.reply({ text: "❌ Este comando é exclusivo para servidores do Discord." });
        }

        if (message.isPrivate || !message.raw?.guild) {
            return message.reply({ text: "❌ Este comando só pode ser usado dentro de um servidor do Discord." });
        }

        const guild = message.raw.guild;
        const userMember = message.raw.member;
        const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));

        // Permissão para gerenciar expressões / emojis e figurinhas do servidor
        const managePerm = PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers || (1n << 30n);

        const userHasPerm = userMember?.permissions?.has(managePerm) || userMember?.permissions?.has(PermissionFlagsBits.Administrator) || isOwner(message);
        const botHasPerm = botMember?.permissions?.has(managePerm) || botMember?.permissions?.has(PermissionFlagsBits.Administrator) || false;

        if (!userHasPerm) {
            return message.reply({
                text: "❌ Você precisa da permissão **Gerenciar Emojis e Figurinhas** (Manage Guild Expressions) neste servidor para usar este comando."
            });
        }

        if (!botHasPerm) {
            return message.reply({
                text: "❌ O bot precisa da permissão **Gerenciar Emojis e Figurinhas** (Manage Guild Expressions) neste servidor para criar figurinhas."
            });
        }

        const args = message.args || [];
        const text = (message.getArgText ? message.getArgText(0) : args.join(" ")).trim();
        const quotedText = message.quoted?.text || "";
        const combinedText = `${text} ${quotedText}`.trim();

        let mediaUrl = null;
        let mediaBuffer = null;
        let detectedName = null;
        let isAnimated = false;

        // 1. Mídia anexada na mensagem atual ou respondida
        const mediaObj = message.media || (message.quoted && message.quoted.media);
        if (mediaObj && typeof mediaObj.getBuffer === "function") {
            mediaBuffer = await mediaObj.getBuffer().catch(() => null);
            if (mediaObj.mimeType) {
                const mime = String(mediaObj.mimeType).toLowerCase();
                isAnimated = mime.includes("gif") || mime.includes("webp") || mediaObj.type === "video";
            }
        }

        // 2. Anexos nativos do Discord (message.raw.attachments ou mensagem citada)
        if (!mediaBuffer && message.raw?.attachments?.size > 0) {
            const attachment = message.raw.attachments.first();
            if (attachment?.url) {
                mediaUrl = attachment.url;
                if (attachment.name) {
                    detectedName = path.parse(attachment.name).name;
                }
            }
        }

        if (!mediaBuffer && !mediaUrl && message.raw?.messageReference?.messageId) {
            const channel = message.raw.channel;
            const quotedMsg = await channel?.messages?.fetch(message.raw.messageReference.messageId).catch(() => null);
            if (quotedMsg?.attachments?.size > 0) {
                const attachment = quotedMsg.attachments.first();
                if (attachment?.url) {
                    mediaUrl = attachment.url;
                    if (attachment.name) {
                        detectedName = path.parse(attachment.name).name;
                    }
                }
            }
        }

        // 3. Emojis customizados padrão do Discord (<:name:id> ou <a:name:id>)
        if (!mediaBuffer && !mediaUrl) {
            const stdEmojiMatch = combinedText.match(/<(a)?:([a-zA-Z0-9_]+):(\d+)>/i);
            if (stdEmojiMatch) {
                const anim = !!stdEmojiMatch[1];
                detectedName = stdEmojiMatch[2];
                const emojiId = stdEmojiMatch[3];
                const ext = anim ? "gif" : "png";
                mediaUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;
                isAnimated = anim;
            }
        }

        // 4. Emojis do Vencord / FakeNitro ([Name](https://cdn.discordapp.com/emojis/ID...))
        if (!mediaBuffer && !mediaUrl) {
            const vencordEmojiMatch = combinedText.match(/\[([^\]]+)\]\((https?:\/\/(?:cdn|media)\.discord(?:app)?\.(?:com|net)\/emojis\/(\d+)(?:\.[a-zA-Z0-9]+)?(?:\?[^\s)]*)?)\)/i);
            if (vencordEmojiMatch) {
                detectedName = vencordEmojiMatch[1];
                mediaUrl = vencordEmojiMatch[2];
                isAnimated = mediaUrl.includes("animated=true") || mediaUrl.endsWith(".gif");
            }
        }

        // 5. Figurinhas do Vencord ou Discord ([Name](https://cdn.discordapp.com/stickers/ID...))
        if (!mediaBuffer && !mediaUrl) {
            const stickerMarkdownMatch = combinedText.match(/\[([^\]]+)\]\((https?:\/\/(?:cdn|media)\.discord(?:app)?\.(?:com|net)\/stickers\/(\d+)(?:\.[a-zA-Z0-9]+)?(?:\?[^\s)]*)?)\)/i);
            if (stickerMarkdownMatch) {
                detectedName = stickerMarkdownMatch[1];
                mediaUrl = stickerMarkdownMatch[2];
            }
        }

        if (!mediaBuffer && !mediaUrl) {
            const directStickerMatch = combinedText.match(/(https?:\/\/(?:cdn|media)\.discord(?:app)?\.(?:com|net)\/stickers\/(\d+)(?:\.[a-zA-Z0-9]+)?(?:\?[^\s)]*)?)/i);
            if (directStickerMatch) {
                mediaUrl = directStickerMatch[1];
                detectedName = `sticker_${directStickerMatch[2]}`;
            }
        }

        // 6. Figurinhas nativas anexadas à mensagem no Discord
        if (!mediaBuffer && !mediaUrl) {
            const stickerItems = message.raw?.stickerItems || message.raw?.stickers;
            if (stickerItems && stickerItems.size > 0) {
                const sticker = stickerItems.first();
                if (sticker?.id) {
                    detectedName = sticker.name || `sticker_${sticker.id}`;
                    mediaUrl = `https://cdn.discordapp.com/stickers/${sticker.id}.png`;
                }
            }
        }

        // 7. URL direta em texto (https://...)
        if (!mediaBuffer && !mediaUrl) {
            const directUrlMatch = combinedText.match(/(https?:\/\/[^\s]+)/i);
            if (directUrlMatch) {
                mediaUrl = directUrlMatch[1];
            }
        }

        // Se encontrou uma URL, baixa o buffer
        if (!mediaBuffer && mediaUrl) {
            try {
                mediaBuffer = await fetchBuffer(mediaUrl);
                if (mediaUrl.endsWith(".gif") || mediaUrl.includes("animated=true")) {
                    isAnimated = true;
                }
            } catch (err) {
                console.error("[DSTICKER_CMD] Falha ao baixar mídia via URL:", err.message || err);
            }
        }

        if (!mediaBuffer || mediaBuffer.length === 0) {
            return message.reply({
                text: `⚠️ Nenhuma imagem, GIF ou figurinha encontrada!\n\n` +
                      `📌 **Como usar:**\n` +
                      `• Envie o comando com uma foto/GIF anexada ou respondendo à mensagem\n` +
                      `• Ou envie um emoji/figurinha de outro servidor (ou Vencord): \`${message.prefix}dsticker minha_figurinha <:custom_emoji:12345678>\`\n` +
                      `• **Modos disponíveis:**\n` +
                      `  - \`${message.prefix}dsticker <nome>\` / \`${message.prefix}ds\` — Proporção original\n` +
                      `  - \`${message.prefix}fdsticker <nome>\` / \`${message.prefix}fds\` — Esticar total (512x512)\n` +
                      `  - \`${message.prefix}rdsticker <nome>\` / \`${message.prefix}rds\` — Cortar quadrado no centro`
            });
        }

        // Extrai o nome desejado a partir dos argumentos (ignorando URLs e marcadores de emoji)
        let customNameArg = null;
        for (const arg of args) {
            const cleanArg = arg.trim();
            if (!cleanArg) continue;
            if (/^https?:\/\//i.test(cleanArg)) continue;
            if (/^<a?:[a-zA-Z0-9_]+:\d+>$/i.test(cleanArg)) continue;
            if (/^\[.+\]\(https?:\/\/.+\)$/i.test(cleanArg)) continue;

            customNameArg = cleanArg;
            break;
        }

        const rawStickerName = customNameArg || detectedName || `figurinha_${Date.now().toString().slice(-6)}`;
        const finalStickerName = sanitizeStickerName(rawStickerName);

        // Define o modo com base no alias invocado
        const cmdName = (message.command || "dsticker").toLowerCase();
        let mode = "contain";
        if (["fdsticker", "fds", "fdfig", "fdfigurinha"].includes(cmdName)) {
            mode = "fill";
        } else if (["rdsticker", "rds", "rdfig", "rdfigurinha"].includes(cmdName)) {
            mode = "cover";
        }

        const resizeOptions = { fit: mode };
        if (mode === "contain") {
            resizeOptions.background = { r: 0, g: 0, b: 0, alpha: 0 };
        } else if (mode === "cover") {
            resizeOptions.position = "center";
        }

        try {
            await message.react("⏳").catch(() => {});

            let processedBuffer = null;
            if (isAnimated) {
                try {
                    processedBuffer = await sharp(mediaBuffer, { animated: true })
                        .resize(512, 512, resizeOptions)
                        .gif({ loop: 0 })
                        .toBuffer();
                } catch (animErr) {
                    console.warn("[DSTICKER_CMD] Processamento animado falhou, tentando PNG estático:", animErr.message || animErr);
                }
            }

            if (!processedBuffer) {
                processedBuffer = await sharp(mediaBuffer)
                    .resize(512, 512, resizeOptions)
                    .png({ quality: 90 })
                    .toBuffer();
            }

            const newSticker = await guild.stickers.create({
                file: processedBuffer,
                name: finalStickerName,
                tags: "📌",
                description: "Criado via Satela"
            });

            await message.react("✅").catch(() => {});
            return message.reply({
                text: `✅ Figurinha **${newSticker.name}** adicionada ao servidor com sucesso!`
            });
        } catch (err) {
            console.error("[DSTICKER_CMD] Erro ao criar figurinha no Discord:", err);
            await message.react("❌").catch(() => {});

            let errMsg = "Não foi possível criar a figurinha. Verifique as permissões e tente novamente.";
            if (err.message?.includes("Maximum number of stickers reached")) {
                errMsg = "O servidor atingiu o limite máximo de figurinhas (stickers) permitidas.";
            } else if (err.message?.includes("File size exceeds")) {
                errMsg = "A imagem da figurinha excede o limite de tamanho suportado pelo Discord (512 KB).";
            }

            return message.reply({
                text: `❌ Falha ao criar figurinha no servidor: ${errMsg}`
            });
        }
    }
};
