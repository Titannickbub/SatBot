module.exports = {
    name: "setai",
    aliases: ["setkeyai", "aikey"],
    category: "ia",
    description: "Configura uma chave de API gratuita de IA (Gemini, Groq ou OpenRouter) para o bot.",
    usage: "{prefix}setai <gemini|groq|openrouter> <sua_chave>",
    examples: [
        "{prefix}setai gemini AIzaSy...",
        "{prefix}setai groq gsk_..."
    ],

    async execute(message) {
        const owners = message.functions.owners;
        if (owners && !owners.isOwner(message)) {
            return await message.reply({
                text: "❌ Apenas Super Usuários podem configurar chaves de API."
            });
        }

        const args = message.args;
        if (!args.length || args.length < 2) {
            const aiHelper = message.functions.aiHelper || require("../../functions/aiHelper");
            const config = aiHelper.getConfig();
            let statusTxt = `⚙️ *Status da IA*\n`;
            statusTxt += `• Gemini: ${config.geminiKey ? "✅ Chave configurada" : "❌ Não configurada"}\n`;
            statusTxt += `• Groq: ${config.groqKey ? "✅ Chave configurada" : "❌ Não configurada"}\n`;
            statusTxt += `• OpenRouter: ${config.openrouterKey ? "✅ Chave configurada" : "❌ Não configurada"}\n\n`;
            statusTxt += `📌 *Como configurar chaves 100% grátis:*\n`;
            statusTxt += `• **Google Gemini**: https://aistudio.google.com (Crie uma chave que começa com \`AIzaSy...\`)\n`;
            statusTxt += `• **Groq**: https://console.groq.com (Crie uma chave que começa com \`gsk_...\`)\n\n`;
            statusTxt += `Uso: \`${message.prefix}setai <gemini|groq|openrouter> <sua_chave>\``;
            return await message.reply({ text: statusTxt });
        }

        const provider = args[0].toLowerCase();
        const key = args[1].trim();

        const aiHelper = message.functions.aiHelper || require("../../functions/aiHelper");

        try {
            aiHelper.setKey(provider, key);
            return await message.reply({
                text: `✅ Chave de API para *${provider.toUpperCase()}* configurada com sucesso!\n\nTeste digitando: \`${message.prefix}ia Olá, tudo bem?\``
            });
        } catch (err) {
            return await message.reply({
                text: `❌ Erro ao salvar chave: ${err.message}`
            });
        }
    }
};
