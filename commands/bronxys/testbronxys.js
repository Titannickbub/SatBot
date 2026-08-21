const bronxys = require("../../functions/bronxys");

module.exports = {
    name: "testbronxys",
    description: "Testa a validade e o saldo de pedidos da API Bronxys",
    usage: "{prefix}testbronxys",
    examples: ["{prefix}testbronxys"],

    async execute(message) {
        try {
            const config = bronxys.loadConfig();

            if (!config.apiKey || config.apiKey === "") {
                return await message.reply({
                    text: "❌ Chave de API (API Key) não configurada!\n\nPor favor, configure o arquivo settings/bronxys.json."
                });
            }

            // Início do feedback visual síncrono
            await message.react("🔎", true);

            // Chamada de verificação corrigida
            const data = await bronxys.verifyApiKey();

            await message.react("🔎", false);

            if (data && data.success) {
                await message.react("✅", true);
                await message.reply({
                    text: `✅ *Chave de API Válida!*\n\n📊 *Pedidos disponíveis:* ${data.requests ?? 0}\n\n🤖 O bot Satella está pronto para realizar downloads.`
                });
            } else {
                await message.react("❌", true);
                await message.reply({
                    text: `❌ *Falha na validação:*\nResposta da API: _${data?.message || "Chave inválida ou expirada."}_`
                });
            }

        } catch (err) {
            await message.react("🔎", false);
            await message.react("❌", true);

            console.error("[TESTBRONXYS_ERROR] Erro ao conectar à API Bronxys:", err.message);

            await message.reply({
                text: "❌ *Erro de ligação:* Não foi possível estabelecer contacto com o servidor da Bronxys. Tente novamente mais tarde."
            });
        }
    }
};