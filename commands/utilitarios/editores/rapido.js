const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "rapido",
    category: "utilitarios/editores",
    description: `🐇 Acelera um áudio ou vídeo. Em vídeos, mantém o áudio sincronizado.

Responda a um áudio ou vídeo, ou envie a mídia junto com o comando:
{prefix}rapido [2x]
{prefix}rapido 2x`,
    usage: "{prefix}rapido [2x]",
    examples: ["{prefix}rapido (respondendo a um áudio ou vídeo)", "{prefix}rapido 2x"],
    async execute(message) {
        return editMedia(message, {
            name: "rapido",
            label: "velocidade aumentada",
            speedRate: 1.5,
            speedRate2x: 2
        });
    }
};
