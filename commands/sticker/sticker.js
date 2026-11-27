const { createStickerBuffer, createTelegramSticker } = require("../../functions/stickerHelper");
const telegramStickerHelper = require("../../functions/telegramStickerHelper");

const AUDIO_CONTAIN_ALIASES = [
    "sa", "saudio", "figa", "figaudio", "sfiga", "sfigurinhaa", "figurinhaaudio", "sasticker", "stickeraudio"
];
const AUDIO_FILL_ALIASES = [
    "fa", "faudio", "ffiga", "ffigaudio", "ffigurinhaa", "ffigurinhaaudio", "fasticker", "fastickeraudio", "fstickeraudio"
];
const AUDIO_COVER_ALIASES = [
    "ra", "raudio", "rfiga", "rfigaudio", "rfigurinhaa", "rfigurinhaaudio", "rasticker", "rastickeraudio", "rstickeraudio"
];
const ALL_AUDIO_ALIASES = [
    ...AUDIO_CONTAIN_ALIASES,
    ...AUDIO_FILL_ALIASES,
    ...AUDIO_COVER_ALIASES
];

module.exports = {
    name: "sticker",
    aliases: [
        "s", "fig", "figurinha",
        "f", "fsticker", "ffig", "ffigurinha",
        "r", "rsticker", "rfig", "rfigurinha",
        ...ALL_AUDIO_ALIASES
    ],
    description: `🎨 Como utilizar?

🎬 A partir de um vídeo

Marque um vídeo para gerar uma figurinha baseada na imagem e no áudio dele.

🖼️ Imagem + áudio

Responda a uma mensagem de áudio com uma imagem e coloque o comando na legenda. A figurinha será criada usando a imagem enviada e o áudio selecionado.

⚙️ Comandos de ajuste

Os comandos abaixo permitem escolher como a mídia será adaptada ao formato quadrado da figurinha:

"{prefix}s" — Gera a figurinha em tamanho normal, utilizando fundo transparente para ajustar o tamanho da mídia.

"{prefix}r" — Faz um recorte quadrado no centro da mídia, ocupando toda a extensão da figurinha.

"{prefix}f" — Estica a mídia para preencher o formato quadrado, sem realizar recortes.

🔊 Com áudio (somente WhatsApp):

"{prefix}sa" — Gera a figurinha em tamanho normal, utilizando fundo transparente ou preto para ajustar o tamanho da mídia.

"{prefix}ra" — Faz um recorte quadrado no centro da mídia, ocupando toda a extensão da figurinha.

"{prefix}fa" — Estica a mídia para preencher o formato quadrado, sem realizar recortes.

📏 Limites e detalhes:
• No WhatsApp, GIFs/vídeos podem ter até 10 segundos (vídeos mais longos usam automaticamente os 10 primeiros segundos). A figurinha animada pode ter até 500 KB (o bot comprime automaticamente). Se preferir outro trecho, use {prefix}cortar.
• O áudio da figurinha sonora pode ter até 30 segundos.

📦 PACOTES PESSOAIS — somente Telegram
• {prefix}delfig ou {prefix}delsticker — responda à figurinha para removê-la do seu pacote.
• {prefix}delpack, {prefix}deletarpacote ou {prefix}limparpacote — exclui o pacote inteiro.

🛠️ FIGURINHAS E EMOJIS DO SERVIDOR — somente Discord
• {prefix}dsticker, {prefix}ds, {prefix}dfig ou {prefix}dfigurinha — cria uma figurinha do servidor ({prefix}fdsticker, {prefix}fds, {prefix}fdfig, {prefix}fdfigurinha estica; {prefix}rdsticker, {prefix}rds, {prefix}rdfig, {prefix}rdfigurinha recorta).
• {prefix}emoji, {prefix}e, {prefix}semoji ou {prefix}addemoji — cria um emoji ({prefix}femoji, {prefix}fe estica; {prefix}remoji, {prefix}re recorta).`,
    category: "sticker",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "none"
    },
    usage: `{prefix}s | {prefix}fig | {prefix}figurinha | {prefix}sticker
{prefix}r | {prefix}rfig | {prefix}rfigurinha | {prefix}rsticker
{prefix}f | {prefix}ffig | {prefix}ffigurinha | {prefix}fsticker
{prefix}sa | {prefix}saudio | {prefix}figa | {prefix}figaudio | {prefix}sfiga | {prefix}sfigurinhaa | {prefix}figurinhaaudio | {prefix}sasticker | {prefix}stickeraudio
{prefix}ra | {prefix}raudio | {prefix}rfiga | {prefix}rfigaudio | {prefix}rfigurinhaa | {prefix}rfigurinhaaudio | {prefix}rasticker | {prefix}rastickeraudio | {prefix}rstickeraudio
{prefix}fa | {prefix}faudio | {prefix}ffiga | {prefix}ffigaudio | {prefix}ffigurinhaa | {prefix}ffigurinhaaudio | {prefix}fasticker | {prefix}fastickeraudio | {prefix}fstickeraudio
{prefix}delfig | {prefix}delsticker
{prefix}delpack | {prefix}deletarpacote | {prefix}limparpacote`,
    examples: [
        "{prefix}s (com foto/vídeo anexado ou respondendo à mídia)",
        "{prefix}r (recorta a mídia em quadrado pelo centro)",
        "{prefix}f (estica a mídia para preencher o quadrado)",
        "{prefix}sa (com áudio no WhatsApp: vídeo com som ou imagem respondendo ao áudio)",
        "{prefix}ra (com áudio recortado pelo centro)",
        "{prefix}fa (com áudio esticado)"
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
        const isAudioSticker = ALL_AUDIO_ALIASES.includes(commandName);
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
                const p = message.prefix || "!";
                return message.reply({
                    text: `🎨 Como utilizar?

🎬 A partir de um vídeo

Marque um vídeo para gerar uma figurinha baseada na imagem e no áudio dele.

🖼️ Imagem + áudio

Responda a uma mensagem de áudio com uma imagem e coloque o comando na legenda. A figurinha será criada usando a imagem enviada e o áudio selecionado.

⚙️ Comandos de ajuste

Os comandos abaixo permitem escolher como a mídia será adaptada ao formato quadrado da figurinha:

"${p}sa" — Gera a figurinha em tamanho normal, utilizando fundo transparente ou preto para ajustar o tamanho da mídia.

"${p}ra" — Faz um recorte quadrado no centro da mídia, ocupando toda a extensão da figurinha.

"${p}fa" — Estica a mídia para preencher o formato quadrado, sem realizar recortes.`
                });
            }
        }

        if (!mediaObj || typeof mediaObj.getBuffer !== "function") {
            const p = message.prefix || "!";
            return message.reply({
                text: `🎨 Como utilizar?

🎬 A partir de um vídeo

Marque um vídeo para gerar uma figurinha baseada na imagem e no áudio dele.

🖼️ Imagem + áudio

Responda a uma mensagem de áudio com uma imagem e coloque o comando na legenda. A figurinha será criada usando a imagem enviada e o áudio selecionado.

⚙️ Comandos de ajuste

Os comandos abaixo permitem escolher como a mídia será adaptada ao formato quadrado da figurinha:

"${p}s" — Gera a figurinha em tamanho normal, utilizando fundo transparente para ajustar o tamanho da mídia.

"${p}r" — Faz um recorte quadrado no centro da mídia, ocupando toda a extensão da figurinha.

"${p}f" — Estica a mídia para preencher o formato quadrado, sem realizar recortes.

🔊 Com áudio (somente WhatsApp):

"${p}sa" — Gera a figurinha em tamanho normal, utilizando fundo transparente ou preto para ajustar o tamanho da mídia.

"${p}ra" — Faz um recorte quadrado no centro da mídia, ocupando toda a extensão da figurinha.

"${p}fa" — Estica a mídia para preencher o formato quadrado, sem realizar recortes.`
            });
        }

        try {
            await message.react("⏳").catch(() => {});
            const buffer = await mediaObj.getBuffer();

            if (!buffer || buffer.length === 0) {
                return message.reply({ text: "❌ Não foi possível baixar a mídia da mensagem." });
            }

            let mode = "contain";
            if (["f", "fsticker", "ffig", "ffigurinha", ...AUDIO_FILL_ALIASES].includes(commandName)) {
                mode = "fill";
            } else if (["r", "rsticker", "rfig", "rfigurinha", ...AUDIO_COVER_ALIASES].includes(commandName)) {
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
                const { createAudioStickerAudio, probeAudioDuration } = require("../../functions/audioStickerHelper");
                const audioBuffer = audioMedia === mediaObj
                    ? buffer
                    : await audioMedia.getBuffer();

                // Se o áudio marcado for muito longo (> 30s), ensina a recortar com o !cortar
                const isMarkedAudio = isAudio(audioMedia);
                const rawSeconds = Number(audioMedia?.raw?.seconds || audioMedia?.raw?.duration || 0);
                let duration = rawSeconds;
                if (!duration || duration <= 0) {
                    duration = await probeAudioDuration(audioBuffer);
                }

                if (isMarkedAudio && duration && duration > 30.5) {
                    const prefix = message.prefix || "!";
                    return message.reply({
                        text: `⚠️ O áudio marcado é muito longo! Figurinhas com áudio no WhatsApp suportam no máximo 30 segundos (duração detectada: ${Math.ceil(duration)}s).\n\nUse o comando \`${prefix}cortar <início> <fim>\` (por exemplo: \`${prefix}cortar 00:00 00:20\`) respondendo ao áudio para recortar o trecho desejado e depois tente novamente.`
                    });
                }

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
                const prefix = message.prefix || "!";
                return message.reply({ text: `❌ No WhatsApp, GIFs/vídeos para figurinhas podem ter no máximo 10 segundos.\n\nUse \`${prefix}cortar\` para selecionar o trecho do vídeo que quer usar na figurinha, depois tente novamente.` });
            }
            if (err.code === "STICKER_SIZE_LIMIT") {
                const limit = mediaObj.type === "video" || mediaObj.type === "gif" ||
                    String(mediaObj.mimeType || "").toLowerCase().includes("gif")
                    ? "500 KB para figurinhas animadas"
                    : "100 KB para figurinhas estáticas";
                const prefix = message.prefix || "!";
                return message.reply({ text: `❌ A figurinha gerada excedeu o limite do WhatsApp de ${limit} mesmo após a compressão.\n\nTente usar \`${prefix}cortar\` para selecionar um trecho menor do vídeo.` });
            }
            const whatsappLimits = message.platform === "whatsapp"
                ? ` No WhatsApp: GIFs/vídeos até 10 segundos; figurinha animada até 500 KB (comprimida automaticamente) ou 100 KB se estática. Vídeos mais longos: use \`${message.prefix || "!"}cortar\` para selecionar o trecho.`
                : "";
            return message.reply({ text: `❌ Falha ao criar a figurinha. Envie uma imagem, GIF ou vídeo válido.${whatsappLimits}` });
        }
    }
};
