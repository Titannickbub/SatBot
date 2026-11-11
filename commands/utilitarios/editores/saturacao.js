const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "saturacao",
    category: "utilitarios/editores",
    description: `🎨 Aumenta a saturação das cores de fotos e vídeos. Use 2x para dobrar o aumento.

Responda a uma foto ou vídeo, ou envie a mídia junto com o comando:
{prefix}saturacao [2x]
{prefix}saturacao 2x`,
    usage: "{prefix}saturacao [2x]",
    examples: [
        "{prefix}saturacao (respondendo a uma foto ou vídeo)",
        "{prefix}saturacao 2x"
    ],
    async execute(message) {
        return editMedia(message, {
            name: "saturacao",
            label: "saturação aumentada",
            inputDescription: "uma foto ou vídeo",
            allowedMediaTypes: ["image", "video"],
            saturationIncrease: 0.5
        });
    }
};
