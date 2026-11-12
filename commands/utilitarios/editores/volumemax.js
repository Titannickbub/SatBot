const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "volumemax",
    category: "utilitarios/editores",
    description: `🔊 Aumenta o volume do áudio de uma mídia.

Responda a um áudio ou vídeo, ou envie a mídia junto com o comando:
{prefix}volumemax`,
    usage: "{prefix}volumemax",
    examples: ["{prefix}volumemax (respondendo a um áudio ou vídeo)"],
    async execute(message) {
        return editMedia(message, {
            name: "volumemax",
            label: "volume aumentado",
            allowedMediaTypes: ["audio", "video"],
            maximizeVolume: true,
            supportsMultiplier: false
        });
    }
};
