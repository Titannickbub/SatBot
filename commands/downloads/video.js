const bronxys = require("../../functions/bronxys");
const { renderMediaBanner } = require("../../functions/mediaBanner");

module.exports = {
    name: "video",
    description: `🎬 Baixa vídeos em MP4 a partir de links ou buscando pelo título em diversas plataformas (YouTube, TikTok, Instagram, Twitter/X, Facebook, Kwai e iFunny).

📝 1. Baixe buscando pelo título ou assunto do vídeo:
{prefix}video <título do vídeo>
{prefix}video trailer gta 6
{prefix}video melhores momentos futebol

🔗 2. Baixe diretamente por link:
{prefix}video <URL>
{prefix}video https://youtu.be/...
{prefix}video https://www.tiktok.com/...
{prefix}video https://www.instagram.com/p/...
{prefix}video https://br.ifunny.co/video/...

O bot processa a mídia na melhor resolução disponível e envia o vídeo diretamente no chat.`,
    usage:
        "{prefix}video <link ou nome do video>",

    category: "utilitarios",

    examples: [
        "{prefix}video hotel caro",
        "{prefix}video https://youtu.be/...",
        "{prefix}video https://www.tiktok.com/...",
        "{prefix}video https://www.instagram.com/p/...",
        "{prefix}video https://br.ifunny.co/video/..."
    ],

    async execute(message) {
        const input = message.args.join(" ");

        if (!input.trim()) {
            return await message.reply({
                text: `❌ Você precisa informar um link ou o nome de um vídeo.\nExemplo: ${message.prefix}video did i tell u jumpstyle`
            });
        }

        const isUrl = /^https?:\/\//i.test(input);

        // Identifica a plataforma para personalizar o feedback visual
        let platformName = "YouTube";
        const inputDetection = isUrl ? bronxys.detectMediaLinkType(input) : null;
        if (isUrl) {
            const names = {
                youtube: "YouTube",
                tiktok: "TikTok",
                instagram: "Instagram",
                twitter: "X (Twitter)",
                facebook: "Facebook",
                kwai: "Kwai",
                ifunny: "iFunny"
            };
            platformName = names[inputDetection?.platform] || "";
            if (!platformName || inputDetection.type !== "video") {
                // Se não for nenhuma conhecida, cancela antes de disparar reações
                return await message.reply({
                    text: inputDetection?.platform === "soundcloud"
                        ? "ℹ️ O SoundCloud contém áudio. Use o comando `!play` com o link."
                        : "⚠️ Link ou plataforma não reconhecida. Use uma URL válida do YouTube, TikTok, Instagram, X/Twitter, Facebook, Kwai ou iFunny."
                });
            }
        }

        try {
            // 1. Sinaliza início da busca/extração
            await message.react("🔎", true);

            let buffer, title;
            let targetUrl = input;
            let videoInfo = null;

            const isYouTube = /youtube\.com|youtu\.be/i.test(input);
            const shouldSearch = !isUrl || isYouTube;

            if (shouldSearch) {
                try {
                    const results = await bronxys.searchYouTube(input);
                    if (results && Array.isArray(results) && results.length > 0) {
                        const firstResult = results[0];
                        targetUrl = firstResult.url;
                        videoInfo = firstResult;
                    }
                } catch (searchErr) {
                    if (bronxys.isApiError(searchErr)) throw searchErr;
                    console.error("[VIDEO_SEARCH_WARNING] Falha ao obter detalhes:", searchErr.message);
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
                ? `📥 Baixando vídeo de *"${videoInfo.titulo}"* (${videoInfo.tempo})...`
                : `📹 Vou ver se encontro esse vídeo no *${platformName}*... Isso pode demorar um pouco, te aviso se conseguir.`;

            try {
                const banner = await renderMediaBanner({
                    type: "video",
                    platform: platformName || "YouTube",
                    title: videoInfo?.titulo || `Vídeo do ${platformName || "YouTube"}`,
                    author: videoInfo?.autor,
                    duration: videoInfo?.tempo,
                    thumbnail: videoInfo?.thumb
                });
                await message.replyImg({
                    image: banner,
                    caption: statusText,
                    fileName: "video-preview.png"
                });
            } catch (bannerErr) {
                console.error("[VIDEO_BANNER_WARNING] Falha ao gerar ou enviar o banner:", bannerErr.message || bannerErr);
                await message.reply({ text: statusText });
            }

            // 2. Fluxo de Download da API
            const targetPlatform = bronxys.detectMediaLinkType(targetUrl)?.platform;
            if (targetPlatform === "youtube") {
                buffer = await bronxys.downloadYouTubeVideo(targetUrl);
                title = videoInfo ? videoInfo.titulo : "Vídeo do YouTube";
            } else if (targetPlatform === "tiktok") {
                buffer = await bronxys.downloadTikTok(targetUrl);
                title = "Vídeo do TikTok";
            } else if (targetPlatform === "instagram") {
                buffer = await bronxys.downloadInstagram(targetUrl);
                title = "Vídeo do Instagram";
            } else if (targetPlatform === "twitter") {
                buffer = await bronxys.downloadTwitter(targetUrl, "video");
                title = "Vídeo do Twitter";
            } else if (targetPlatform === "facebook") {
                buffer = await bronxys.downloadFacebook(targetUrl, "video");
                title = "Vídeo do Facebook";
            } else if (targetPlatform === "kwai") {
                buffer = await bronxys.downloadKwai(targetUrl);
                title = "Vídeo do Kwai";
            } else if (targetPlatform === "ifunny") {
                buffer = await bronxys.downloadIFunny(targetUrl);
                title = "Vídeo do iFunny";
            } else {
                throw new Error("A API não retornou uma plataforma de vídeo compatível para este link.");
            }

            // Validação de tamanho com base no buffer recebido
            const sizeMB = buffer.length / 1024 / 1024;
            bronxys.checkFileSize(buffer, message.platform);

            console.log(
                `[BRONXYS] Vídeo baixado com sucesso: ${sizeMB.toFixed(2)}MB`
            );

            // 3. Transição de reações: Remove busca e adiciona upload
            await message.react("🔎", false);
            await message.react("📥", true);

            // 4. Envia o arquivo de vídeo
            const captionText = videoInfo
                ? `🎬 *${videoInfo.titulo}*\n⏱️ *Duração:* ${videoInfo.tempo}\n👤 *Canal:* ${videoInfo.autor}\n📊 *Tamanho:* ${sizeMB.toFixed(2)}MB`
                : `🎬 *${title}*\n📊 *Tamanho:* ${sizeMB.toFixed(2)}MB`;

            await message.replyVideo({
                video: buffer,
                caption: captionText
            });

            // 5. Finaliza com sucesso
            await message.react("📥", false);
            await message.react("✅", true);

        } catch (err) {
            // Limpa o progresso e sinaliza falha
            await message.react("🔎", false);
            await message.react("📥", false);
            await message.react("❌", true);

            // Log técnico completo retido no console da VPS
            console.error(`[VIDEO_ERROR] Falha no input "${input}":`, err);

            // Mensagem amigável para o cliente final
            let userFriendlyMessage = bronxys.getUserErrorMessage(err, message.prefix) ||
                "❌ Não consegui processar e baixar o vídeo solicitado. A API de extração pode estar instável ou o link está indisponível.";

            if (err.message.includes("muito grande")) {
                userFriendlyMessage = "⚠️ O arquivo solicitado excede o limite permitido. Tente outro vídeo.";
            }

            await message.reply({ text: userFriendlyMessage });
        }
    }
};
