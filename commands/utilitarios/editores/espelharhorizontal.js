const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "espelharhorizontal",
    category: "utilitarios/editores",
    description: `↔️ Espelha uma foto ou vídeo na horizontal.

Responda a uma foto ou vídeo, ou envie a mídia junto com o comando:
{prefix}espelharhorizontal`,
    usage: "{prefix}espelharhorizontal",
    examples: ["{prefix}espelharhorizontal (respondendo a uma foto ou vídeo)"],
    async execute(message) {
        return editMedia(message, {
            name: "espelharhorizontal",
            label: "espelhamento horizontal",
            inputDescription: "uma foto ou vídeo",
            allowedMediaTypes: ["image", "video"],
            mirrorFilter: "hflip",
            supportsMultiplier: false
        });
    }
};
