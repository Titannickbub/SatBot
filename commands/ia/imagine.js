module.exports = {
    name: "imagine",
    aliases: ["gerarimg", "dalle", "stablediffusion", "desenhar"],
    category: "ia",
    description: "Gera uma imagem de alta qualidade usando Inteligência Artificial (100% Grátis).",
    usage: "{prefix}imagine <descrição da imagem em português ou inglês>",
    examples: [
        "{prefix}imagine Um gato astronauta flutuando no espaço, arte digital 4k",
        "{prefix}imagine Paisagem futurista estilo cyberpunk com luzes neon",
        "{prefix}imagine Um dragão de cristal no topo de uma montanha de neve"
    ],

    async execute(message) {
        const prompt = message.args.join(" ");

        if (!prompt) {
            return await message.reply({
                text: `🎨 *Geração de Imagens por IA (Grátis)*\n\nUso: \`${message.prefix}imagine <descrição da imagem>\`\nExemplo: \`${message.prefix}imagine Um gato navegando em um barco à noite\``
            });
        }

        const aiHelper = message.functions.aiHelper || require("../../functions/aiHelper");

        await message.reply({
            text: "🎨 *Gerando sua imagem com IA... Aguarde alguns segundos.*"
        });

        try {
            const imageBuffer = await aiHelper.generateImage(prompt);
            const caption = `🎨 *Imagem gerada por IA:*\n"${prompt}"`;

            if (typeof message.replyImg === "function") {
                return await message.replyImg({
                    image: imageBuffer,
                    caption
                });
            }

            const sendFn = message.functions?.send || require("../../functions/send");
            return await sendFn.sendImg(
                message.platform,
                message.chatId,
                message.threadId,
                imageBuffer,
                caption
            );
        } catch (err) {
            console.error("❌[IMAGINE] Erro ao gerar imagem:", err);
            return await message.reply({
                text: `❌ Falha ao gerar a imagem: ${err.message}`
            });
        }
    }
};
