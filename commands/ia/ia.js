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
        const configFn = message.functions.config || require("../../functions/config");
        const botName = typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot";
        let prompt = (message.getArgText ? message.getArgText(0) : message.args.join(" ")).trim();

        if (!prompt && message.quoted?.text) {
            prompt = `Explique ou responda sobre esta mensagem: "${message.quoted.text}"`;
        } else if (message.quoted?.text) {
            prompt = `[Mensagem respondida: "${message.quoted.text}"]\n\n${prompt}`;
        }

        if (!prompt) {
            return await message.reply({
                text: `💡 *Inteligência Artificial ${botName}*\n\nUso: \`${message.prefix}ia <sua pergunta>\` ou responda a uma mensagem com \`${message.prefix}ia\`\nExemplo: \`${message.prefix}ia Escreva um poema sobre a lua\``
            });
        }

        const aiHelper = message.functions.aiHelper || require("../../functions/aiHelper");
        const owners = message.functions.owners;
        const isOwner = owners && typeof owners.isOwner === "function" ? owners.isOwner(message) : false;

        const thinkingMsg = message.platform === "discord" ? `🧠 **${botName} pensando...**` : `🧠 *${botName} pensando...*`;

        await message.reply({
            text: thinkingMsg
        });

        try {
            const responseText = await aiHelper.chatAI(prompt, {
                platform: message.platform,
                isOwner: isOwner
            });
            return await message.reply({
                text: responseText
            });
        } catch (err) {
            console.error("❌[IA] Erro ao processar resposta:", err);
            const errText = message.platform === "discord"
                ? "❌ **Não consegui obter uma resposta da IA agora.** Tente novamente em instantes."
                : "❌ Não consegui obter uma resposta da IA agora. Tente novamente em instantes.";
            return await message.reply({
                text: errText
            });
        }
    }
};
