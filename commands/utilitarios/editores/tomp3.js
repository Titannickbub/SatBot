const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "tomp3",
    category: "utilitarios/editores",
    description: `🎵 Extrai e converte o áudio de um vídeo para MP3.

Responda a um vídeo ou envie-o junto com o comando:
{prefix}tomp3`,
    usage: "{prefix}tomp3",
    examples: ["{prefix}tomp3 (respondendo a um vídeo)"],
    async execute(message) {
        return editMedia(message, {
            name: "tomp3",
            label: "áudio extraído em MP3",
            extractAudio: true,
            supportsMultiplier: false
        });
    }
};
