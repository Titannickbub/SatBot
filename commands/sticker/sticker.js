const { createStickerBuffer, createTelegramSticker } = require("../../functions/stickerHelper");
const telegramStickerHelper = require("../../functions/telegramStickerHelper");

module.exports = {
    name: "sticker",
    aliases: [
        "s", "fig", "figurinha",
        "f", "fsticker", "ffig", "ffigurinha",
        "r", "rsticker", "rfig", "rfigurinha",
        "sa", "fa", "ra"
    ],
    description: `🖼️ FIGURINHAS DE FOTO, GIF OU VÍDEO
Disponível no WhatsApp e Telegram. Envie o comando junto da mídia ou responda à mensagem que contém a mídia.

📐 Modos de criação:
• Proporção original: {prefix}sticker, {prefix}s, {prefix}fig ou {prefix}figurinha
• Esticar para preencher: {prefix}f, {prefix}fsticker, {prefix}ffig ou {prefix}ffigurinha
• Recortar quadrado pelo centro: {prefix}r, {prefix}rsticker, {prefix}rfig ou {prefix}rfigurinha

🔊 FIGURINHAS COM ÁUDIO — somente WhatsApp
Use {prefix}sa para manter a proporção, {prefix}fa para esticar ou {prefix}ra para recortar.
Envie um vídeo com som ou combine uma imagem/vídeo com um áudio respondendo a uma das mídias. O áudio pode ter até 30 segundos.

📏 Limites e detalhes:
• No WhatsApp, GIFs/vídeos podem ter até 10 segundos. A figurinha final pode ter até 100 KB se estática ou 5 MB se animada (limite experimental).
• No Telegram, a figurinha criada também pode ser adicionada ao seu pacote pessoal.

📦 PACOTES PESSOAIS — somente Telegram
• {prefix}delfig ou {prefix}delsticker — responda à figurinha para removê-la do seu pacote.
• {prefix}delpack, {prefix}deletarpacote ou {prefix}limparpacote — exclui o pacote inteiro.

🛠️ FIGURINHAS E EMOJIS DO SERVIDOR — somente Discord
• {prefix}dsticker, {prefix}ds, {prefix}dfig ou {prefix}dfigurinha — cria uma figurinha do servidor.
• {prefix}fdsticker, {prefix}fds, {prefix}fdfig ou {prefix}fdfigurinha — estica a mídia.
• {prefix}rdsticker, {prefix}rds, {prefix}rdfig ou {prefix}rdfigurinha — recorta pelo centro.
• {prefix}emoji, {prefix}e, {prefix}semoji ou {prefix}addemoji — cria um emoji; {prefix}femoji/{prefix}fe estica e {prefix}remoji/{prefix}re recorta.
Esses comandos do Discord são separados do comando sticker e exigem permissão para gerenciar expressões no servidor.`,
    category: "sticker",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "none"
    },
    usage: `Mídia anexada ao comando ou resposta à mensagem:
{prefix}sticker | {prefix}s | {prefix}fig | {prefix}figurinha
{prefix}f | {prefix}fsticker | {prefix}ffig | {prefix}ffigurinha
{prefix}r | {prefix}rsticker | {prefix}rfig | {prefix}rfigurinha
Áudio (WhatsApp): {prefix}sa | {prefix}fa | {prefix}ra
Pacote (Telegram): {prefix}delfig | {prefix}delsticker [respondendo à figurinha]
{prefix}delpack | {prefix}deletarpacote | {prefix}limparpacote`,
    examples: [
        "{prefix}sticker (com foto/vídeo anexado ou respondendo à mídia)",
        "{prefix}ffig (mesmas formas de envio; estica a mídia)",
        "{prefix}rfigurinha (mesmas formas de envio; recorta pelo centro)",
        "{prefix}sa (vídeo com som ou imagem/vídeo combinado com áudio no WhatsApp)"
    ],

    async execute(message) {
        if (!["whatsapp", "telegram"].includes(message.platform)) {
            if (message.platform === "discord") {
                const prefix = message.prefix || "!";
                return message.reply({ text: `📌 No Discord, use \`${prefix}dsticker <nome>\` para criar figurinhas do servidor ou \`${prefix}emoji <nome>\` para emojis.` });
            }
            return message.reply({ text: "❌ O comando de figurinha está disponível para WhatsApp e Telegram." });
        }

        const commandName = (message.command || "sticker").toLowerCase();
        const isAudioSticker = ["sa", "fa", "ra"].includes(commandName);
        if (isAudioSticker && message.platform !== "whatsapp") {
            return message.reply({ text: "❌ Figurinhas com áudio estão disponíveis apenas no WhatsApp." });
        }
        const currentMedia = message.media;
        const quotedMedia = message.quoted && message.quoted.media;
        const isAudio = media => media && (
            String(media.type || "").toLowerCase() === "audio" ||
            String(media.mimeType || "").toLowerCase().startsWith("audio/")
        );
        const isVisual = media => media && (
            ["image", "video", "gif", "sticker"].includes(String(media.type || "").toLowerCase()) ||
            /^(image|video)\//i.test(String(media.mimeType || ""))
        );
        let mediaObj = currentMedia || quotedMedia;
        let audioMedia = null;

        if (isAudioSticker) {
            if (isVisual(currentMedia) && isAudio(quotedMedia)) {
                mediaObj = currentMedia;
                audioMedia = quotedMedia;
            } else if (isAudio(currentMedia) && isVisual(quotedMedia)) {
                mediaObj = quotedMedia;
                audioMedia = currentMedia;
            } else if (String(currentMedia?.type || "").toLowerCase() === "video") {
                mediaObj = currentMedia;
                audioMedia = currentMedia;
            } else if (String(quotedMedia?.type || "").toLowerCase() === "video") {
                mediaObj = quotedMedia;
                audioMedia = quotedMedia;
            } else {
                return message.reply({
                    text: `⚠️ Para criar figurinha com áudio, use ${message.prefix || "!"}sa em um vídeo com som, ou combine uma imagem/vídeo com um áudio respondendo a uma das mídias. Use fa para esticar ou ra para recortar. O áudio é limitado a 30 segundos.`
                });
            }
        }

        if (!mediaObj || typeof mediaObj.getBuffer !== "function") {
            const prefix = message.prefix || "!";
            const whatsappLimits = message.platform === "whatsapp"
                ? "\n\n📏 *Limites experimentais do WhatsApp:* imagem até 100 KB; figurinha animada até 5 MB e GIF/vídeo de até 10 segundos. O limite de KB/MB é da figurinha gerada, não do arquivo enviado."
                : "";
            const audioHelp = message.platform === "whatsapp"
                ? `\n• \`${prefix}sa\` / \`${prefix}fa\` / \`${prefix}ra\` — figurinha com áudio (até 30 segundos).`
                : "";
            return message.reply({
                text: `⚠️ Anexe uma foto/vídeo ao comando ou responda à mensagem de mídia.\n\n` +
                    `📌 *Modos disponíveis:*\n` +
                    `• \`${prefix}sticker\` / \`${prefix}s\` / \`${prefix}fig\` / \`${prefix}figurinha\` — proporção original.\n` +
                    `• \`${prefix}f\` / \`${prefix}fsticker\` / \`${prefix}ffig\` / \`${prefix}ffigurinha\` — esticar.\n` +
                    `• \`${prefix}r\` / \`${prefix}rsticker\` / \`${prefix}rfig\` / \`${prefix}rfigurinha\` — recortar pelo centro.` +
                    audioHelp +
                    whatsappLimits
            });
        }

        try {
            await message.react("⏳").catch(() => {});
            const buffer = await mediaObj.getBuffer();

            if (!buffer || buffer.length === 0) {
                return message.reply({ text: "❌ Não foi possível baixar a mídia da mensagem." });
            }

            let mode = "contain";
            if (["f", "fsticker", "ffig", "ffigurinha", "fa"].includes(commandName)) {
                mode = "fill";
            } else if (["r", "rsticker", "rfig", "rfigurinha", "ra"].includes(commandName)) {
                mode = "cover";
            }

            const configFn = message.functions?.config || require("../../functions/config");
            const stickerConfig = typeof configFn.getStickerConfig === "function"
                ? configFn.getStickerConfig()
                : {
                    packName: configFn.getBotName?.() || "Sat Bot",
                    authorName: configFn.getBotName?.() || "Sat Bot",
                    description: "venha pro SatBot https://titannickbub.neocities.org/"
                };

            const telegramSticker = message.platform === "telegram"
                ? await createTelegramSticker(buffer, {
                    mimeType: mediaObj.mimeType,
                    type: mediaObj.type,
                    mode,
                    packName: stickerConfig.packName,
                    authorName: stickerConfig.authorName,
                    description: stickerConfig.description
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
                    authorName: stickerConfig.authorName,
                    description: stickerConfig.description,
                    addMetadata: message.platform === "whatsapp"
                });

            if (isAudioSticker) {
                const { createAudioStickerAudio } = require("../../functions/audioStickerHelper");
                const audioBuffer = audioMedia === mediaObj
                    ? buffer
                    : await audioMedia.getBuffer();
                const audio = await createAudioStickerAudio(audioBuffer);
                const metadata = await require("sharp")(stickerBuffer, { animated: true, failOn: "none" }).metadata();
                await message.replyAudioSticker({
                    sticker: stickerBuffer,
                    audio: audio.buffer,
                    durationSeconds: audio.durationSeconds,
                    waveform: audio.waveform,
                    width: metadata.width || 512,
                    height: metadata.pageHeight || metadata.height || 512,
                    isAnimated: (Number(metadata.pages) || 1) > 1
                });
                await message.react("✅").catch(() => {});
                return;
            }

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
                    ? "5 MB (limite experimental) para figurinhas animadas"
                    : "100 KB para figurinhas estáticas";
                return message.reply({ text: `❌ A figurinha gerada excedeu o limite do WhatsApp de ${limit}. Tente uma mídia mais simples ou curta.` });
            }
            const whatsappLimits = message.platform === "whatsapp"
                ? " No WhatsApp: GIFs/vídeos até 10 segundos; figurinha final até 5 MB (limite experimental) se animada ou 100 KB se estática."
                : "";
            return message.reply({ text: `❌ Falha ao criar a figurinha. Envie uma imagem, GIF ou vídeo válido.${whatsappLimits}` });
        }
    }
};
