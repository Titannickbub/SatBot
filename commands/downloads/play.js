const path = require("path");
const bronxys = require("../../functions/bronxys");
const { renderMediaBanner } = require("../../functions/mediaBanner");

function createAudioFilename(title) {
    const safeTitle = String(title || "audio")
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/, "")
        .slice(0, 180);

    return `${safeTitle || "audio"}.mp3`;
}

module.exports = {
    name: "play",
    description: `🎵 Baixa áudios em MP3 a partir de links ou buscando pelo nome em diversas plataformas (YouTube, SoundCloud, TikTok, Instagram, Spotify, X/Twitter e Facebook).

📝 1. Baixe buscando pelo nome da música:
{prefix}play <nome da música>
{prefix}play hotel caro
{prefix}play Bohemian Rhapsody

🔗 2. Baixe diretamente por link:
{prefix}play <URL>
{prefix}play https://youtu.be/...
{prefix}play https://soundcloud.com/artista/faixa
{prefix}play https://www.tiktok.com/...
{prefix}play https://www.instagram.com/reel/...

O bot extrai o áudio na melhor qualidade disponível e envia o arquivo de música diretamente no chat.`,
    category: "utilitarios",
    usage: "{prefix}play <link ou nome da música>",
    examples: [
        "{prefix}play hotel caro",
        "{prefix}play https://youtu.be/...",
        "{prefix}play https://soundcloud.com/artista/faixa",
        "{prefix}play https://www.tiktok.com/...",
        "{prefix}play https://www.instagram.com/p/..."
    ],
    async execute(message) {
        const input = message.args.join(" ");

        if (!input) {
            return await message.reply({
                text: `❌ Você precisa informar um link ou o nome de uma música.\nExemplo: ${message.prefix}play did i tell u jumpstyle`
            });
        }

        // Identifica a plataforma pelo link enviado para personalizar a mensagem inicial
        const isUrl = /^https?:\/\//i.test(input);
        const detected = isUrl ? bronxys.detectMediaLinkType(input) : null;
        let platformName = "YouTube";
        const names = {
            youtube: "YouTube",
            tiktok: "TikTok",
            instagram: "Instagram",
            twitter: "X (Twitter)",
            facebook: "Facebook",
            kwai: "Kwai",
            soundcloud: "SoundCloud"
        };
        if (detected) platformName = names[detected.platform] || platformName;
        else if (isUrl && /spotify\.com/i.test(input)) platformName = "Spotify";
        else if (isUrl) {
            return await message.reply({ text: "⚠️ Link ou plataforma de áudio não reconhecida." });
        }
        if (detected?.type === "video" && ["kwai", "ifunny"].includes(detected.platform)) {
            return await message.reply({
                text: `⚠️ Esse link é de vídeo. Use \`${message.prefix}video\` para baixar a mídia.`
            });
        }

        try {
            // 1. Sinaliza o início da busca/processamento
            await message.react("🔎", true);

            let buffer;
            let targetUrl = input;
            let videoInfo = null;

            const isYouTube = /youtube\.com|youtu\.be/i.test(input);
            const shouldSearch = !isUrl || isYouTube;

            if (shouldSearch) {
                try {
                    videoInfo = await bronxys.getYouTubeMetadata(input);
                    targetUrl = videoInfo.url;
                } catch (searchErr) {
                    if (bronxys.isApiError(searchErr)) throw searchErr;
                    console.error("[PLAY_SEARCH_WARNING] Falha ao obter detalhes:", searchErr.message);
                }
            }

            if (!isUrl && !videoInfo) {
                await message.react("🔎", false);
                await message.react("❌", true);
                return await message.reply({
                    text: `❌ Não encontrei nenhum resultado no YouTube para: *"${input}"*`
                });
            }

            const statusText = videoInfo 
                ? `📥 Baixando áudio de *"${videoInfo.titulo}"* (${videoInfo.tempo})...`
                : `📥 Obtendo mídia do *${platformName}*... Isso pode demorar um pouco.`;

            try {
                const banner = await renderMediaBanner({
                    type: "audio",
                    platform: platformName,
                    title: videoInfo?.titulo || `Áudio do ${platformName}`,
                    author: videoInfo?.autor,
                    duration: videoInfo?.tempo,
                    thumbnail: videoInfo?.thumb
                });
                await message.replyImg({
                    image: banner,
                    caption: statusText,
                    fileName: "play-preview.png"
                });
            } catch (bannerErr) {
                console.error("[PLAY_BANNER_WARNING] Falha ao gerar ou enviar o banner:", bannerErr.message || bannerErr);
                await message.reply({ text: statusText });
            }

            // 2. Fluxo de Download Dinâmico baseado no Link ou Busca por Nome
            if (isUrl) {
                if (platformName === "TikTok") buffer = await bronxys.downloadTikTok(input);
                else if (platformName === "Instagram") buffer = await bronxys.downloadInstagram(input);
                else if (platformName === "Spotify") buffer = await bronxys.downloadSpotify(input);
                else if (platformName === "X (Twitter)") buffer = await bronxys.downloadTwitter(input);
                else if (platformName === "Facebook") buffer = await bronxys.downloadFacebook(input);
                else if (platformName === "SoundCloud") buffer = await bronxys.downloadSoundCloud(input);
                else if (platformName === "Kwai" || /ifunny\.co/i.test(input)) {
                    await message.react("🔎", false);
                    await message.react("❌", true);
                    return await message.reply({
                        text: `⚠️ Esse link é de vídeo. Use \`${message.prefix}video\` para baixar essa mídia.`
                    });
                }
                else buffer = await bronxys.downloadYouTubeAudio(targetUrl); // Padrão se for link do YT
            } else {
                buffer = await bronxys.downloadYouTubeAudio(targetUrl);
            }

            // Validação básica do tamanho antes de tentar enviar (evita quebrar o adaptador)
            bronxys.checkFileSize(buffer, message.platform);

            // 3. Transição: Remove busca, adiciona reação de upload/envio
            await message.react("🔎", false);
            await message.react("📥", true);

            // 4. Envia o arquivo de áudio de volta
            const captionText = videoInfo 
                ? `🎶 *${videoInfo.titulo}*\n⏱️ *Duração:* ${videoInfo.tempo}\n👤 *Canal:* ${videoInfo.autor}`
                : `🎶 Mídia baixada do ${platformName}`;

            await message.replyAudio({
                audio: buffer,
                caption: captionText,
                filename: createAudioFilename(videoInfo && videoInfo.titulo)
            });

            // 5. Finaliza com sucesso
            await message.react("📥", false);
            await message.react("✅", true);

        } catch (err) {
            // Limpa as reações de progresso em caso de falha
            await message.react("🔎", false);
            await message.react("📥", false);
            await message.react("❌", true);

            // Log técnico detalhado e privado no console da VPS
            console.error(`[PLAY_ERROR] Falha ao processar requisição para o input "${input}":`, err);

            // Mensagem amigável e limpa para o usuário final
            let userFriendlyMessage = bronxys.getUserErrorMessage(err, message.prefix) ||
                "❌ Desculpe, não consegui processar o seu download no momento. A API de extração pode estar instável ou o link está indisponível.";
            
            // Tratamento específico se estourar o limite de tamanho da plataforma
            if (err.message.includes("muito grande")) {
                userFriendlyMessage = "⚠️ O arquivo solicitado excede o limite permitido. Tente outra mídia.";
            }

            await message.reply({ text: userFriendlyMessage });
        }
    }
};
