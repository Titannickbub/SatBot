const bronxys = require("../../functions/bronxys");
const { isOwner } = require("../../functions/owners");

module.exports = {
    name: "setkey",
    aliases: ["setbronxyskey", "setkeybronxys", "bronxyskey", "apikey", "apikeybronxys"],
    description: `🔑 Valida e salva uma nova chave da API Bronxys para os comandos que usam esse serviço.

🔐 Disponível apenas para superusuários / donos do bot.

📝 1. Informe a nova chave de API:
{prefix}setkey <nova_chave>
{prefix}setkey SUA_NOVA_CHAVE_BRONXYS

🎁 O SatBot já vem com a API key gratuita da Bronxys ativada por padrão. Ela só funciona quando o bot está hospedado na Bronxys.

🔹 Se a chave gratuita não estiver funcionando na Bronxys, reative-a com:
{prefix}setkey bronxys

⚠️ Se você hospeda o bot fora da Bronxys, compre uma API key em https://api.bronxyshost.com.br/ e ative-a com:
{prefix}setkey SUA_APIKEY

O comando valida e salva a chave sem exibi-la no chat. Depois de cadastrada, ela passa a ser usada nos comandos que dependem da API.

🌐 Compre ou recarregue sua chave de API no site oficial:
https://api.bronxyshost.com.br/

🧪 Para verificar se a chave atual está funcionando sem alterá-la, use:
{prefix}testbronxys`,
    category: "system/bronxys",
    usage: "{prefix}setkey [texto]",
    examples: [
        "{prefix}setkey SUA_NOVA_CHAVE_BRONXYS",
        "{prefix}setbronxyskey SUA_NOVA_CHAVE_BRONXYS",
        "{prefix}apikey bronxys"
    ],

    async execute(message) {
        const isSuperUser = message.sender?.isOwner || isOwner(message);
        if (!isSuperUser) {
            return await message.reply({
                text: "❌ Apenas superusuários / donos do bot podem alterar a chave de API da Bronxys."
            });
        }

        let newKey = message.args[0]?.trim();
        const isHostKey = newKey?.toLowerCase() === "bronxys";
        if (isHostKey) {
            newKey = bronxys.HOST_API_KEY;
        }
        if (!newKey) {
            return await message.reply({
                text: `❌ Você precisa informar a nova chave de API.\nExemplo: ${message.prefix}setkey SUAKEY123`
            });
        }

        try {
            await message.react("🔎", true).catch(() => {});

            // Valida a nova chave enviando para a API Bronxys antes de salvar (mesma lógica do testbronxys)
            const data = await bronxys.verifyApiKey(newKey);

            await message.react("🔎", false).catch(() => {});

            if (data && data.success) {
                // Chave válida! Atualiza a configuração em settings/bronxys.json
                bronxys.setApiKey(newKey);

                await message.react("✅", true).catch(() => {});
                return await message.reply({
                    text: `✅ *${isHostKey ? "Chave Host da Bronxys ativada e validada" : "Chave de API da Bronxys atualizada e validada"} com sucesso!*\n\n📊 *Pedidos disponíveis:* ${data.requests ?? 0}\n⚙️ Configuração salva em _settings/bronxys.json_.`
                });
            } else {
                await message.react("❌", true).catch(() => {});
                return await message.reply({
                    text: "❌ *Falha na validação da nova chave:* ela é inválida ou está expirada.\n\n⚠️ A chave de API não foi alterada."
                });
            }
        } catch (err) {
            await message.react("🔎", false).catch(() => {});
            await message.react("❌", true).catch(() => {});

            console.error("[SETKEY_ERROR] Erro ao validar nova chave Bronxys:", err.message || err);

            const errorMessage = bronxys.getUserErrorMessage(err, message.prefix) ||
                "❌ Não foi possível validar a chave com o servidor Bronxys. Tente novamente mais tarde.";
            return await message.reply({
                text: `${errorMessage}\n\n⚠️ A chave de API não foi alterada.`
            });
        }
    }
};
