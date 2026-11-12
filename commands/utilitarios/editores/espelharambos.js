const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "espelharambos",
    category: "utilitarios/editores",
    description: `🔄 Espelha uma foto ou vídeo na vertical e na horizontal.

Responda a uma foto ou vídeo, ou envie a mídia junto com o comando:
{prefix}espelharambos`,
    usage: "{prefix}espelharambos",
    examples: ["{prefix}espelharambos (respondendo a uma foto ou vídeo)"],
    async execute(message) {
        return editMedia(message, {
            name: "espelharambos",
            label: "espelhamento vertical e horizontal",
            inputDescription: "uma foto ou vídeo",
            allowedMediaTypes: ["image", "video"],
            mirrorFilter: "hflip,vflip",
            supportsMultiplier: false
        });
    }
};
