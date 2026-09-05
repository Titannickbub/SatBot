const bronxys = require("../../functions/bronxys");

module.exports = {
    name: "video",
    description: "Baixa vídeo do YouTube, TikTok, Instagram, Twitter e outras plataformas",
    usage:
        "{prefix}video <link ou nome do video>",

    category: "downloads",

    examples: [
        "{prefix}video hotel caro",
        "{prefix}video https://youtu.be/...",
        "{prefix}video https://www.tiktok.com/...",
        "{prefix}video https://www.instagram.com/p/..."
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
        if (isUrl) {
            if (input.includes("tiktok")) platformName = "TikTok";
            else if (input.includes("instagram")) platformName = "Instagram";
            else if (input.includes("twitter") || input.includes("x.com")) platformName = "X (Twitter)";
            else if (input.includes("facebook")) platformName = "Facebook";
            else if (input.includes("kwai")) platformName = "Kwai";
            else if (!input.includes("youtube") && !input.includes("youtu.be")) {
                // Se não for nenhuma conhecida, cancela antes de disparar reações
                return await message.reply({
                    text: "⚠️ Link ou plataforma não reconhecida. Use uma URL válida do YouTube, TikTok, Instagram, Twitter, Facebook ou Kwai."
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

            if (videoInfo && videoInfo.thumb) {
                try {
                    await message.replyImg({
                        url: videoInfo.thumb,
                        caption: statusText
                    });
                } catch (imgErr) {
                    console.error("[VIDEO_THUMBNAIL_WARNING] Falha ao enviar imagem do thumbnail:", imgErr.message);
                    await message.reply({ text: statusText });
                }
            } else {
                await message.reply({ text: statusText });
            }

            // 2. Fluxo de Download da API
            if (targetUrl.includes("youtube") || targetUrl.includes("youtu.be")) {
                buffer = await bronxys.downloadYouTubeVideo(targetUrl);
                title = videoInfo ? videoInfo.titulo : "Vídeo do YouTube";
            } else if (targetUrl.includes("tiktok")) {
                buffer = await bronxys.downloadTikTok(targetUrl);
                title = "Vídeo do TikTok";
            } else if (targetUrl.includes("instagram")) {
                buffer = await bronxys.downloadInstagram(targetUrl);
                title = "Vídeo do Instagram";
            } else if (targetUrl.includes("twitter") || targetUrl.includes("x.com")) {
                buffer = await bronxys.downloadTwitter(targetUrl, "video");
                title = "Vídeo do Twitter";
            } else if (targetUrl.includes("facebook")) {
                buffer = await bronxys.downloadFacebook(targetUrl, "video");
                title = "Vídeo do Facebook";
            } else if (targetUrl.includes("kwai")) {
                buffer = await bronxys.downloadKwai(targetUrl);
                title = "Vídeo do Kwai";
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
            let userFriendlyMessage = "❌ Não consegui processar e baixar o vídeo solicitado. A API de extração pode estar instável ou o link está indisponível.";

            if (err.message.includes("muito grande")) {
                userFriendlyMessage = "⚠️ O arquivo solicitado excede o limite permitido. Tente outro vídeo.";
            }

            await message.reply({ text: userFriendlyMessage });
        }
    }
};
