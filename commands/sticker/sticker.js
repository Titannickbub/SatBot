const { createStickerBuffer, createTelegramSticker } = require("../../functions/stickerHelper");
const telegramStickerHelper = require("../../functions/telegramStickerHelper");

module.exports = {
    name: "sticker",
    aliases: [
        "s", "fig", "figurinha",
        "f", "fsticker", "ffig", "ffigurinha",
        "r", "rsticker", "rfig", "rfigurinha"
    ],
    description: `🖼️ Converte fotos, imagens, GIFs ou vídeos curtos em figurinhas (stickers) para WhatsApp e Telegram.

📝 1. Crie a figurinha mantendo a proporção original:
{prefix}s
{prefix}fig
{prefix}sticker

Envie uma foto ou vídeo com o comando na legenda, ou responda à mensagem de mídia com o comando.

📐 2. Modos alternativos de ajuste:
• {prefix}f / {prefix}fsticker — Estica a imagem para preencher toda a figurinha.
• {prefix}r / {prefix}rsticker — Recorta a imagem em formato quadrado centralizado.

📌 Observações:
• Suporta fotos, imagens, GIFs e vídeos curtos (até 10 segundos).
• No Discord, utilize {prefix}dsticker para figurinhas de servidor ou {prefix}emoji para emojis.`,
    category: "sticker",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "none"
    },
    usage: "{prefix}sticker (normal), {prefix}fsticker (esticar) ou {prefix}rsticker (recortar centro)",
    examples: [
        "{prefix}sticker / {prefix}s / {prefix}fig / {prefix}figurinha (manter proporção)",
        "{prefix}f / {prefix}fsticker / {prefix}ffig / {prefix}ffigurinha (esticar total)",
        "{prefix}r / {prefix}rsticker / {prefix}rfig / {prefix}rfigurinha (cortar centro)"
    ],

    async execute(message) {
        if (!["whatsapp", "telegram"].includes(message.platform)) {
            if (message.platform === "discord") {
                return message.reply({ text: "📌 No Discord, use `!dsticker <nome>` para criar figurinhas do servidor ou `!emoji <nome>` para emojis." });
            }
            return message.reply({ text: "❌ O comando de figurinha está disponível para WhatsApp e Telegram." });
        }

        const mediaObj = message.media || (message.quoted && message.quoted.media);

        if (!mediaObj || typeof mediaObj.getBuffer !== "function") {
            const whatsappLimits = message.platform === "whatsapp"
                ? "\n\n📏 *Limites do WhatsApp:* imagem até 100 KB; figurinha animada até 500 KB (0,5 MB) e GIF/vídeo de até 10 segundos. Os limites de KB/MB são da figurinha gerada, não do arquivo enviado."
                : "";
            return message.reply({
                text: "⚠️ Envie a foto/vídeo com o comando *" + (message.prefix || "!") + "sticker* na legenda, ou responda/marque uma imagem/vídeo com o comando!\n\n" +
                      "📌 *Modos disponíveis:*\n" +
                      "• `!sticker` / `!s` / `!fig` / `!figurinha` — Proporção original\n" +
                      "• `!f` / `!fsticker` / `!ffig` / `!ffigurinha` — Esticar total\n" +
                      "• `!r` / `!rsticker` / `!rfig` / `!rfigurinha` — Cortar quadrado no centro" +
                      whatsappLimits
            });
        }

        try {
            await message.react("⏳").catch(() => {});
            const buffer = await mediaObj.getBuffer();

            if (!buffer || buffer.length === 0) {
                return message.reply({ text: "❌ Não foi possível baixar a mídia da mensagem." });
            }

            const cmdName = (message.command || "sticker").toLowerCase();
            let mode = "contain";
            if (["f", "fsticker", "ffig", "ffigurinha"].includes(cmdName)) {
                mode = "fill";
            } else if (["r", "rsticker", "rfig", "rfigurinha"].includes(cmdName)) {
                mode = "cover";
            }

            const configFn = message.functions?.config || require("../../functions/config");
            const stickerConfig = typeof configFn.getStickerConfig === "function"
                ? configFn.getStickerConfig()
                : { packName: configFn.getBotName?.() || "Sat Bot", authorName: configFn.getBotName?.() || "Sat Bot" };

            const telegramSticker = message.platform === "telegram"
                ? await createTelegramSticker(buffer, {
                    mimeType: mediaObj.mimeType,
                    type: mediaObj.type,
                    mode,
                    packName: stickerConfig.packName,
                    authorName: stickerConfig.authorName
                })
                : null;
            const stickerBuffer = telegramSticker
                ? telegramSticker.buffer
                : await createStickerBuffer(buffer, {
                    mimeType: mediaObj.mimeType,
                    type: mediaObj.type,
                    platform: message.platform,
                    durationSeconds: mediaObj.raw?.seconds,
                    mode,
                    packName: stickerConfig.packName,
                    authorName: stickerConfig.authorName
                });

            // LÓGICA DO TELEGRAM (Pacotes Pessoais + Envio Direto do Sticker do Pacote)
            if (message.platform === "telegram") {
                const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
                const botInst = global.telegramBot;
                let packResult = null;

                if (store && botInst) {
                    const central = store.findByPlatform("telegram", message.userId);
                    const telegramAccount = central?.platformAccounts?.find(p => p.platform === "telegram");

                    if (central && telegramAccount) {
                        try {
                            const botInfo = await botInst.telegram.getMe().catch(() => null);
                            const botUsername = botInfo?.username || "satela_bot";

                            let packName = store.getTelegramStickerPack(central.id);
                            if (!packName) {
                                packName = telegramStickerHelper.generatePackName(central.id, botUsername);
                            }

                            const packTitle = `Pacote de ${central.name || message.displayName || "Usuário"} (${configFn.getBotName?.() || "Sat Bot"})`;
                            packResult = await telegramStickerHelper.createOrAddStickerToPack(
                                botInst,
                                telegramAccount.platformId,
                                packName,
                                packTitle,
                                stickerBuffer,
                                telegramSticker.format
                            );

                            if (packResult && packResult.packName) {
                                await store.setTelegramStickerPack(central.id, packResult.packName);
                            }
                        } catch (packErr) {
                            console.warn("[STICKER_TELEGRAM_PACK] Não foi possível adicionar ao pacote:", packErr.message || packErr);
                        }
                    }
                }

                // Envia a figurinha que já pertence ao pacote (se adicionada ao pacote com sucesso)
                const stickerToSend = packResult?.fileId || stickerBuffer;
                if (typeof message.replySticker === "function") {
                    await message.replySticker(typeof stickerToSend === "string"
                        ? stickerToSend
                        : { sticker: stickerToSend, format: telegramSticker.format });
                } else if (typeof message.reply === "function") {
                    await message.reply({
                        sticker: stickerToSend,
                        format: telegramSticker.format
                    });
                }

                await message.react("✅").catch(() => {});

                // Se o pacote foi criado agora pela 1ª vez, manda o link uma única vez para salvar no teclado
                if (packResult?.created && packResult?.packUrl) {
                    await message.reply({
                        text: `🎉 **Seu pacote de figurinhas no Telegram foi criado!**\n🔗 [Clique aqui para adicionar seu pacote ao Telegram](${packResult.packUrl})`
                    }).catch(() => {});
                }

                return;
            }

            // LÓGICA DO WHATSAPP E OUTRAS PLATAFORMAS
            if (typeof message.replySticker === "function") {
                await message.replySticker(stickerBuffer);
            } else if (typeof message.reply === "function") {
                await message.reply({ sticker: stickerBuffer });
            }

            await message.react("✅").catch(() => {});
        } catch (err) {
            console.error("[COMANDO STICKER] Erro ao converter figurinha:", err.message || err);
            await message.react("❌").catch(() => {});
            if (err.code === "STICKER_DURATION_LIMIT") {
                return message.reply({ text: "❌ No WhatsApp, GIFs/vídeos para figurinhas podem ter no máximo 10 segundos." });
            }
            if (err.code === "STICKER_SIZE_LIMIT") {
                const limit = mediaObj.type === "video" || mediaObj.type === "gif" ||
                    String(mediaObj.mimeType || "").toLowerCase().includes("gif")
                    ? "500 KB (0,5 MB) para figurinhas animadas"
                    : "100 KB para figurinhas estáticas";
                return message.reply({ text: `❌ A figurinha gerada excedeu o limite do WhatsApp de ${limit}. Tente uma mídia mais simples ou curta.` });
            }
            const whatsappLimits = message.platform === "whatsapp"
                ? " No WhatsApp: GIFs/vídeos até 10 segundos; figurinha final até 500 KB (0,5 MB) se animada ou 100 KB se estática."
                : "";
            return message.reply({ text: `❌ Falha ao criar a figurinha. Envie uma imagem, GIF ou vídeo válido.${whatsappLimits}` });
        }
    }
};
