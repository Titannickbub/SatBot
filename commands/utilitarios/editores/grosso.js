const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "grosso",
    category: "utilitarios/editores",
    description: `🎙️ Deixa a voz mais grossa e grave, mantendo a duração original. Em vídeos, preserva a imagem.

Responda a um áudio ou vídeo, ou envie a mídia junto com o comando:
{prefix}grosso [2x]
{prefix}grosso 2x`,
    usage: "{prefix}grosso [2x]",
    examples: ["{prefix}grosso (respondendo a um áudio ou vídeo)", "{prefix}grosso 2x"],
    async execute(message) {
        return editMedia(message, {
            name: "grosso",
            label: "voz mais grossa",
            pitchRatio: 0.8
        });
    }
};
