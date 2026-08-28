const { createStickerBuffer } = require("../functions/stickerHelper");
const telegramStickerHelper = require("../functions/telegramStickerHelper");

module.exports = {
    name: "sticker",
    aliases: [
        "s", "fig", "figurinha",
        "f", "fsticker", "ffig", "ffigurinha",
        "r", "rsticker", "rfig", "rfigurinha"
    ],
    description: "Cria uma figurinha (sticker) no WhatsApp ou Telegram com ajuste de proporção, esticada ou cortada no centro.",
    category: "sticker",
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
            return message.reply({
                text: "⚠️ Envie a foto/vídeo com o comando *" + (message.prefix || "!") + "sticker* na legenda, ou responda/marque uma imagem/vídeo com o comando!\n\n" +
                      "📌 *Modos disponíveis:*\n" +
                      "• `!sticker` / `!s` / `!fig` / `!figurinha` — Proporção original\n" +
                      "• `!f` / `!fsticker` / `!ffig` / `!ffigurinha` — Esticar total\n" +
                      "• `!r` / `!rsticker` / `!rfig` / `!rfigurinha` — Cortar quadrado no centro"
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

            const configFn = message.functions?.config || require("../functions/config");
            const stickerConfig = typeof configFn.getStickerConfig === "function"
                ? configFn.getStickerConfig()
                : { packName: "Sat Bot", authorName: "Satela" };

            const stickerBuffer = await createStickerBuffer(buffer, {
                mimeType: mediaObj.mimeType,
                type: mediaObj.type,
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

                            const packTitle = `Pacote de ${central.name || message.displayName || "Usuário"} (Satela)`;
                            packResult = await telegramStickerHelper.createOrAddStickerToPack(
                                botInst,
                                telegramAccount.platformId,
                                packName,
                                packTitle,
                                stickerBuffer
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
                    await message.replySticker(stickerToSend);
                } else if (typeof message.reply === "function") {
                    await message.reply({ sticker: stickerToSend });
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
            return message.reply({ text: "❌ Falha ao criar a figurinha. Certifique-se de enviar uma imagem, GIF ou vídeo válido." });
        }
    }
};
