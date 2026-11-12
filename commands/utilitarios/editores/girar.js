const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "girar",
    category: "utilitarios/editores",
    description: `🔃 Gira uma foto ou vídeo 90 graus no sentido horário.

Responda a uma foto ou vídeo, ou envie a mídia junto com o comando:
{prefix}girar 90`,
    usage: "{prefix}girar 90",
    examples: ["{prefix}girar 90 (respondendo a uma foto ou vídeo)"],
    async execute(message) {
        return editMedia(message, {
            name: "girar",
            label: "rotação de 90 graus",
            inputDescription: "uma foto ou vídeo",
            allowedMediaTypes: ["image", "video"],
            usage: "{prefix}girar 90",
            rotateFilter: "transpose=clock",
            supportsMultiplier: false,
            parseArgs(args) {
                if (args.length !== 1 || args[0] !== "90") return { error: true };
                return { multiplier: 1 };
            }
        });
    }
};
