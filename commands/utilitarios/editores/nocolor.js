const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "nocolor",
    category: "utilitarios/editores",
    description: `⚫⚪ Deixa fotos e vídeos em preto e branco.

Responda a uma foto ou vídeo, ou envie a mídia junto com o comando:
{prefix}nocolor`,
    usage: "{prefix}nocolor",
    examples: ["{prefix}nocolor (respondendo a uma foto ou vídeo)"],
    async execute(message) {
        return editMedia(message, {
            name: "nocolor",
            label: "preto e branco",
            inputDescription: "uma foto ou vídeo",
            allowedMediaTypes: ["image", "video"],
            grayscale: true,
            supportsMultiplier: false
        });
    }
};
