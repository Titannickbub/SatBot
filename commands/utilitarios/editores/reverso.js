const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "reverso",
    category: "utilitarios/editores",
    description: `⏪ Reproduz um áudio ou vídeo de trás para frente.

Responda a um áudio ou vídeo, ou envie a mídia junto com o comando:
{prefix}reverso`,
    usage: "{prefix}reverso",
    examples: ["{prefix}reverso (respondendo a um áudio ou vídeo)"],
    async execute(message) {
        return editMedia(message, {
            name: "reverso",
            label: "mídia invertida",
            allowedMediaTypes: ["audio", "video"],
            reverse: true,
            supportsMultiplier: false
        });
    }
};
