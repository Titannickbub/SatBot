const bronxys = require("../../functions/bronxys");

module.exports = {
    name: "testbronxys",
    description: `🧪 Testa a chave Bronxys atualmente configurada e consulta o saldo de pedidos disponível na API.

📝 1. Execute o comando para verificar o estado da chave:
{prefix}testbronxys

O bot conecta ao servidor da Bronxys, valida a chave e exibe a quantidade de pedidos disponíveis. Use antes de baixar mídias para garantir que o serviço está acessível.

🔑 Para alterar a chave de API, use:
{prefix}setkey <nova_chave>`,
    usage: "{prefix}testbronxys",
    examples: ["{prefix}testbronxys"],

    async execute(message) {
        try {
            const configFn = message.functions.config || require("../../functions/config");
            const botName = typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot";
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
                    text: `✅ *Chave de API Válida!*\n\n📊 *Pedidos disponíveis:* ${data.requests ?? 0}\n\n🤖 O bot ${botName} está pronto para realizar downloads.`
                });
            } else {
                await message.react("❌", true);
                await message.reply({
                    text: "❌ *Falha na validação:* A chave de API é inválida ou está expirada."
                });
            }

        } catch (err) {
            await message.react("🔎", false);
            await message.react("❌", true);

            console.error("[TESTBRONXYS_ERROR] Erro ao conectar à API Bronxys:", err.message);

            await message.reply({
                text: bronxys.getUserErrorMessage(err, message.prefix) ||
                    "❌ *Erro de ligação:* Não foi possível estabelecer contacto com o servidor da Bronxys. Tente novamente mais tarde."
            });
        }
    }
};