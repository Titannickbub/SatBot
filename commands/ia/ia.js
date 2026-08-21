module.exports = {
    name: "ia",
    aliases: ["gpt", "satella", "gemini", "ai"],
    category: "ia",
    description: "Conversa ou responde perguntas usando Inteligência Artificial.",
    usage: "{prefix}ia <sua pergunta ou instrução>",
    examples: [
        "{prefix}ia Qual é a velocidade da luz?",
        "{prefix}ia Escreva um poema sobre café",
        "{prefix}ia Explique o que é JavaScript para um leigo"
    ],

    async execute(message) {
        let prompt = message.args.join(" ");

        if (!prompt && message.quoted?.text) {
            prompt = `Explique ou responda sobre esta mensagem: "${message.quoted.text}"`;
        } else if (message.quoted?.text) {
            prompt = `[Mensagem respondida: "${message.quoted.text}"]\n\n${prompt}`;
        }

        if (!prompt) {
            return await message.reply({
                text: `💡 *Inteligência Artificial Satella*\n\nUso: \`${message.prefix}ia <sua pergunta>\` ou responda a uma mensagem com \`${message.prefix}ia\`\nExemplo: \`${message.prefix}ia Escreva um poema sobre a lua\``
            });
        }

        const aiHelper = message.functions.aiHelper || require("../../functions/aiHelper");

        await message.reply({
            text: "🧠 *Satella pensando...*"
        });

        try {
            const responseText = await aiHelper.chatAI(prompt);
            return await message.reply({
                text: responseText
            });
        } catch (err) {
            console.error("❌[IA] Erro ao processar resposta:", err);
            return await message.reply({
                text: `❌ Erro ao obter resposta da IA: ${err.message}`
            });
        }
    }
};
