const api = require("../../functions/api");
const bronxys = require("../../functions/bronxys");

const DESCRIPTION = `📝 Transcreve áudios e vídeos enviados no chat.

Responda a um áudio ou vídeo com o comando, ou envie a mídia junto com ele.

{prefix}transcrever (respondendo a um áudio ou vídeo)
{prefix}transcrever (enviando um áudio ou vídeo)`;

module.exports = {
    name: "transcrever",
    aliases: [],
    category: "utilitarios",
    description: DESCRIPTION,
    usage: "{prefix}transcrever (respondendo a um áudio ou vídeo)",
    examples: [
        "{prefix}transcrever (respondendo a um áudio)",
        "{prefix}transcrever (respondendo a um vídeo)"
    ],

    async execute(message) {
        const media = message.media || message.quoted?.media;
        const mediaType = String(media?.type || "").toLowerCase();
        if (!media || !["audio", "video"].includes(mediaType) || typeof media.getBuffer !== "function") {
            return message.reply({
                text: "❌ Envie um áudio ou vídeo junto com o comando, ou responda a uma mídia dessas com `transcrever`."
            });
        }

        try {
            if (typeof message.react === "function") {
                await message.react("⏳");
            }

            const buffer = await media.getBuffer();
            if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                throw new Error("A mídia está vazia ou não pôde ser baixada.");
            }

            const mimeType = media.mimeType || (mediaType === "audio" ? "audio/ogg" : "video/mp4");
            const formData = api.createFormData({}, [{
                name: "file",
                value: buffer,
                filename: mediaType === "audio" ? "audiofile" : "videofile",
                contentType: mimeType
            }]);
            const apiKey = bronxys.getApiKey();
            const data = await api.postForm(
                `https://api.bronxyshost.com.br/transcrever?apikey=${encodeURIComponent(apiKey)}`,
                formData
            );
            const transcription = typeof data?.texto === "string" ? data.texto.trim() : "";
            if (!transcription) {
                throw new Error(data?.error || data?.erro || data?.message || "A API não retornou uma transcrição.");
            }

            if (typeof message.react === "function") {
                await message.react("✅");
            }
            return message.reply({ text: `📝 *Transcrição:*\n\n${transcription}` });
        } catch (error) {
            console.error("[TRANSCRERVER] Falha ao transcrever mídia:", error);
            if (typeof message.react === "function") {
                await message.react("❌").catch(() => {});
            }

            const apiError = bronxys.getUserErrorMessage(error, message.prefix || "!");
            return message.reply({
                text: apiError || "❌ Não foi possível transcrever essa mídia. Alguns formatos de áudio e vídeo não são compatíveis; tente novamente com outro arquivo."
            });
        }
    }
};
