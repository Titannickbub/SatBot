const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "estourar",
    category: "utilitarios/editores",
    description: `📢 Adiciona distorção ao áudio da mídia. Use 2x para deixar o efeito mais forte.

Responda a um áudio ou vídeo, ou envie a mídia junto com o comando:
{prefix}estourar [2x]
{prefix}estourar 2x`,
    usage: "{prefix}estourar [2x]",
    examples: [
        "{prefix}estourar (respondendo a um áudio ou vídeo)",
        "{prefix}estourar 2x"
    ],
    async execute(message) {
        return editMedia(message, {
            name: "estourar",
            label: "áudio distorcido",
            allowedMediaTypes: ["audio", "video"],
            distortion: true
        });
    }
};
