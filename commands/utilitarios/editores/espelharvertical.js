const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "espelharvertical",
    category: "utilitarios/editores",
    description: `↕️ Espelha uma foto ou vídeo na vertical.

Responda a uma foto ou vídeo, ou envie a mídia junto com o comando:
{prefix}espelharvertical`,
    usage: "{prefix}espelharvertical",
    examples: ["{prefix}espelharvertical (respondendo a uma foto ou vídeo)"],
    async execute(message) {
        return editMedia(message, {
            name: "espelharvertical",
            label: "espelhamento vertical",
            inputDescription: "uma foto ou vídeo",
            allowedMediaTypes: ["image", "video"],
            mirrorFilter: "vflip",
            supportsMultiplier: false
        });
    }
};
