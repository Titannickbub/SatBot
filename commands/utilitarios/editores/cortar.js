const { editMedia, parseMediaTime } = require("../../../functions/mediaEditor");

module.exports = {
    name: "cortar",
    category: "utilitarios/editores",
    description: `✂️ Corta um áudio ou vídeo entre os tempos inicial e final. Os tempos podem ser em segundos ou no formato MM:SS.

Responda à mídia ou envie-a junto com o comando:
{prefix}cortar <início> <fim>
{prefix}cortar 00:10 00:15`,
    usage: "{prefix}cortar <início> <fim>",
    examples: ["{prefix}cortar 00:10 00:15"],
    async execute(message) {
        return editMedia(message, {
            name: "cortar",
            label: "trecho cortado",
            allowedMediaTypes: ["audio", "video"],
            usage: "{prefix}cortar <início> <fim>",
            supportsMultiplier: false,
            parseArgs(args) {
                if (args.length !== 2) return { error: true };
                const start = parseMediaTime(args[0]);
                const end = parseMediaTime(args[1]);
                if (start === null || end === null || end <= start) return { error: true };
                return {
                    multiplier: 1,
                    trim: { start, duration: end - start }
                };
            }
        });
    }
};
