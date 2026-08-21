module.exports = {
    name: "testreact",
    description: "Testa a funcionalidade de reações síncronas",
    usage: "{prefix}testreact",
    examples: ["{prefix}testreact"],

    async execute(message) {
        try {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // 1. Primeiro Emoji (Equivalente à Busca/Espera)
            await message.react("🤔", true);
            await delay(3000);

            // 2. Remove Primeiro e adiciona o Segundo (Equivalente ao Processamento)
            await message.react("🤔", false);
            await message.react("⚡", true);
            await delay(3000);

            // 3. Remove Segundo e adiciona o Terceiro (Equivalente ao Sucesso)
            await message.react("⚡", false);
            await message.react("👍", true);

        } catch (err) {
            console.error("[TESTREACT] Erro durante a execução:", err.message);
            await message.reply({
                text: `❌ Erro ao processar reações: ${err.message}`
            });
        }
    }
};
