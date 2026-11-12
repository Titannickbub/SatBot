const { editMedia } = require("../../../functions/mediaEditor");

module.exports = {
    name: "fino",
    category: "utilitarios/editores",
    description: `🗣️ Deixa a voz mais fina, com efeito agudo tipo gás hélio, mantendo a duração original. Em vídeos, preserva a imagem.

Responda a um áudio ou vídeo, ou envie a mídia junto com o comando:
{prefix}fino [2x]
{prefix}fino 2x`,
    usage: "{prefix}fino [2x]",
    examples: ["{prefix}fino (respondendo a um áudio ou vídeo)", "{prefix}fino 2x"],
    async execute(message) {
        return editMedia(message, {
            name: "fino",
            label: "voz mais fina",
            pitchRatio: 1.25
        });
    }
};
