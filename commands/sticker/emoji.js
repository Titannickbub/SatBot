const sharp = require("sharp");
const { PermissionFlagsBits } = require("discord.js");
const { fetchBuffer } = require("../../functions/api");
const { isOwner } = require("../../functions/owners");
const path = require("path");

function sanitizeEmojiName(inputName) {
    let name = String(inputName || "").trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (name.length < 2) {
        name = `emoji_${name}_${Date.now().toString().slice(-4)}`;
    }
    return name.slice(0, 32);
}

module.exports = {
    name: "emoji",
    aliases: [
        "semoji", "addemoji", "e",
        "femoji", "fe",
        "remoji", "re"
    ],
    category: "sticker",
    platformSupport: {
        discord: "full",
        telegram: "none",
        whatsapp: "none"
    },
    description: `😀 Cria e adiciona um emoji personalizado (estático ou animado) ao servidor do Discord a partir de imagens, GIFs, links ou emojis de outros servidores.

🔐 Exclusivo para o Discord. Requer permissão de Gerenciar Emojis / Expressões no servidor ou Administrador.

📝 1. Crie um emoji informando o nome e a imagem/GIF:
{prefix}emoji <nome>
{prefix}emoji super_gato
{prefix}emoji meu_emoji <:custom_emoji:1234567890>

Envie uma imagem/GIF na legenda com o comando, responda a uma mídia ou cole o emoji/link diretamente.

📐 2. Modos alternativos de ajuste:
• {prefix}femoji / {prefix}fe <nome> — Estica a mídia preenchendo o espaço (128x128).
• {prefix}remoji / {prefix}re <nome> — Recorta a imagem em formato quadrado centralizado.`,
    usage: "{prefix}emoji <nome> [imagem/emoji/link]",
    examples: [
        "{prefix}emoji super_gato (respondendo a uma imagem ou na legenda)",
        "{prefix}emoji meu_emoji <:custom_emoji:1234567890>",
        "{prefix}femoji emoji_esticado (esticar mídia 128x128)",
        "{prefix}remoji emoji_recortado (recortar quadrado centralizado)"
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
                text: "❌ O bot precisa da permissão **Gerenciar Emojis e Figurinhas** (Manage Guild Expressions) neste servidor para criar emojis."
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
                console.error("[EMOJI_CMD] Falha ao baixar mídia via URL:", err.message || err);
            }
        }

        if (!mediaBuffer || mediaBuffer.length === 0) {
            return message.reply({
                text: `⚠️ Nenhuma imagem ou emoji encontrado!\n\n` +
                      `📌 **Como usar:**\n` +
                      `• Envie o comando com uma foto/GIF anexada ou respondendo à mensagem\n` +
                      `• Ou envie um emoji/figurinha de outro servidor (ou Vencord): \`${message.prefix}emoji meu_emoji <:custom_emoji:12345678>\`\n` +
                      `• **Modos disponíveis:**\n` +
                      `  - \`${message.prefix}emoji <nome>\` / \`${message.prefix}e\` — Proporção original\n` +
                      `  - \`${message.prefix}femoji <nome>\` / \`${message.prefix}fe\` — Esticar total (128x128)\n` +
                      `  - \`${message.prefix}remoji <nome>\` / \`${message.prefix}re\` — Cortar quadrado no centro`
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

        const rawEmojiName = customNameArg || detectedName || `emoji_${Date.now().toString().slice(-6)}`;
        const finalEmojiName = sanitizeEmojiName(rawEmojiName);

        // Define o modo com base no alias invocado
        const cmdName = (message.command || "emoji").toLowerCase();
        let mode = "contain";
        if (["femoji", "fe"].includes(cmdName)) {
            mode = "fill";
        } else if (["remoji", "re"].includes(cmdName)) {
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
                        .resize(128, 128, resizeOptions)
                        .gif({ loop: 0 })
                        .toBuffer();
                } catch (animErr) {
                    console.warn("[EMOJI_CMD] Processamento animado falhou, tentando estático:", animErr.message || animErr);
                }
            }

            if (!processedBuffer) {
                processedBuffer = await sharp(mediaBuffer)
                    .resize(128, 128, resizeOptions)
                    .png({ quality: 90 })
                    .toBuffer();
            }

            const newEmoji = await guild.emojis.create({
                attachment: processedBuffer,
                name: finalEmojiName
            });

            await message.react("✅").catch(() => {});
            return message.reply({
                text: `✅ Emoji **:${newEmoji.name}:** (${newEmoji.toString()}) criado e adicionado ao servidor com sucesso!`
            });
        } catch (err) {
            console.error("[EMOJI_CMD] Erro ao criar emoji no Discord:", err);
            await message.react("❌").catch(() => {});

            let errMsg = "Não foi possível criar o emoji. Verifique as permissões e tente novamente.";
            if (err.message?.includes("Maximum number of emojis reached")) {
                errMsg = "O servidor atingiu o limite máximo de emojis customizados permitidos.";
            } else if (err.message?.includes("File size exceeds")) {
                errMsg = "A imagem do emoji excede o limite de tamanho suportado pelo Discord (256 KB).";
            }

            return message.reply({
                text: `❌ Falha ao criar emoji no servidor: ${errMsg}`
            });
        }
    }
};
