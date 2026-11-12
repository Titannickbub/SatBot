const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "lento",
    category: "utilitarios/editores",
    description: `🐢 Deixa um áudio mais lento ou reduz a velocidade de um vídeo, mantendo o áudio sincronizado.

Responda a um áudio ou vídeo, ou envie a mídia junto com o comando:
{prefix}lento [2x]
{prefix}lento 2x`,
    usage: "{prefix}lento [2x]",
    examples: ["{prefix}lento (respondendo a um áudio ou vídeo)", "{prefix}lento 2x"],
    async execute(message) {
        return editMedia(message, {
            name: "lento",
            label: "velocidade reduzida",
            speedRate: 0.75,
            speedRate2x: 0.5
        });
    }
};
