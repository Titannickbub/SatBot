const { editMedia, parseMediaTime } = require("../../../functions/mediaEditor");

module.exports = {
    name: "gif",
    category: "utilitarios/editores",
    description: `🎞️ Converte um trecho de até 10 segundos de um vídeo em GIF.

Responda a um vídeo ou envie-o junto com o comando. Informe o início e a duração:
{prefix}gif <início> <duração>
{prefix}gif 00:10 5`,
    usage: "{prefix}gif <início> <duração (máx. 10s)>",
    examples: ["{prefix}gif 00:10 5"],
    async execute(message) {
        return editMedia(message, {
            name: "gif",
            label: "GIF criado",
            inputDescription: "um vídeo",
            allowedMediaTypes: ["video"],
            usage: "{prefix}gif <início> <duração (máx. 10s)>",
            supportsMultiplier: false,
            parseArgs(args) {
                if (args.length !== 2) return { error: true };
                const start = parseMediaTime(args[0]);
                const duration = parseMediaTime(args[1].replace(/s$/i, ""));
                if (start === null || duration === null || start < 0 || duration <= 0 || duration > 10) {
                    return { error: true };
                }
                return {
                    multiplier: 1,
                    gif: { start, duration }
                };
            }
        });
    }
};
