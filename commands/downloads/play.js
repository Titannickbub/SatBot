const path = require("path");
const bronxys = require("../../functions/bronxys");

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
    description: "Baixa mídias de diversas plataformas através da API Bronxys",
    category: "downloads",
    usage: "{prefix}play <link ou nome da música>",
    examples: [
        "{prefix}play hotel caro",
        "{prefix}play https://youtu.be/...",
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
        let platformName = "YouTube";
        if (/tiktok\.com/i.test(input)) platformName = "TikTok";
        else if (/instagram\.com/i.test(input)) platformName = "Instagram";
        else if (/spotify\.com/i.test(input)) platformName = "Spotify";
        else if (/twitter\.com|x\.com/i.test(input)) platformName = "X (Twitter)";
        else if (/facebook\.com/i.test(input)) platformName = "Facebook";
        else if (/kwai\.com/i.test(input)) platformName = "Kwai";

        // Define se é uma busca por texto ou download direto via URL
        const isUrl = /^https?:\/\//i.test(input);

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

            if (videoInfo && videoInfo.thumb) {
                try {
                    await message.replyImg({
                        url: videoInfo.thumb,
                        caption: statusText
                    });
                } catch (imgErr) {
                    console.error("[PLAY_THUMBNAIL_WARNING] Falha ao enviar imagem do thumbnail:", imgErr.message);
                    await message.reply({ text: statusText });
                }
            } else {
                await message.reply({ text: statusText });
            }

            // 2. Fluxo de Download Dinâmico baseado no Link ou Busca por Nome
            if (isUrl) {
                if (platformName === "TikTok") buffer = await bronxys.downloadTikTok(input);
                else if (platformName === "Instagram") buffer = await bronxys.downloadInstagram(input);
                else if (platformName === "Spotify") buffer = await bronxys.downloadSpotify(input);
                else if (platformName === "X (Twitter)") buffer = await bronxys.downloadTwitter(input);
                else if (platformName === "Facebook") buffer = await bronxys.downloadFacebook(input);
                else if (platformName === "Kwai") buffer = await bronxys.downloadKwai(input);
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
            let userFriendlyMessage = "❌ Desculpe, não consegui processar o seu download no momento. A API de extração pode estar instável ou o link está indisponível.";
            
            // Tratamento específico se estourar o limite de tamanho da plataforma
            if (err.message.includes("muito grande")) {
                userFriendlyMessage = "⚠️ O arquivo solicitado excede o limite permitido. Tente outra mídia.";
            }

            await message.reply({ text: userFriendlyMessage });
        }
    }
};
