const api = require("../functions/api");
const bronxys = require("../functions/bronxys");
const autoTranscribe = require("../functions/autoTranscribeHelper");

function isAudioMedia(media) {
    if (!media) return false;
    if (String(media.type || "").toLowerCase() === "audio") return true;
    if (String(media.mimeType || "").toLowerCase().startsWith("audio/")) return true;
    return /\.(mp3|mpeg|ogg|opus|wav|m4a|aac|amr|flac)$/i.test(String(media.fileName || ""));
}

module.exports = {
    name: "autoTranscribe",
    priority: 45,
    runOn: "all",

    async execute(message) {
        if (
            !message ||
            message.isPrivate ||
            message.isCommand ||
            message.sender?.isBot ||
            message.quoted?.fromMe ||
            !isAudioMedia(message.media) ||
            typeof message.media.getBuffer !== "function"
        ) {
            return true;
        }

        const state = autoTranscribe.getAutoTranscribeState(message);
        if (!state.enabled) return true;

        try {
            const buffer = await message.media.getBuffer();
            if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                throw new Error("O áudio está vazio ou não pôde ser baixado.");
            }

            const formData = api.createFormData({}, [{
                name: "file",
                value: buffer,
                filename: message.media.fileName || "audiofile",
                contentType: message.media.mimeType || "audio/ogg"
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

            await message.reply({ text: `🎙️ *Transcrição automática:*\n\n${transcription}` });
            return true;
        } catch (error) {
            console.error("[AUTO-TRANSCRIBE] Falha ao transcrever áudio recebido:", error);
            const apiError = bronxys.getUserErrorMessage(error, message.prefix || "!");
            await message.reply({
                text: apiError || "❌ Não foi possível transcrever este áudio. Alguns formatos podem não ser compatíveis."
            });
            return true;
        }
    }
};
