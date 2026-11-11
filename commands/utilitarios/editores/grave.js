const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "grave",
    category: "utilitarios/editores",
    description: `🔊 Realça as frequências graves do áudio. Em vídeos, preserva a imagem.

Responda a um áudio ou vídeo, ou envie a mídia junto com o comando:
{prefix}grave [2x]
{prefix}grave 2x`,
    usage: "{prefix}grave [2x]",
    examples: ["{prefix}grave (respondendo a um áudio ou vídeo)", "{prefix}grave 2x"],
    async execute(message) {
        return editMedia(message, {
            name: "grave",
            label: "graves realçados",
            bassGain: 8
        });
    }
};
