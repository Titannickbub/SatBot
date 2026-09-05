const bronxys = require("../../functions/bronxys");
const { isOwner } = require("../../functions/owners");

module.exports = {
    name: "setkey",
    aliases: ["setbronxyskey", "setkeybronxys", "bronxyskey"],
    description: "Altera e valida a chave de API da Bronxys através da verificação do servidor",
    category: "bronxys",
    usage: "{prefix}setkey <nova_chave>",
    examples: [
        "{prefix}setkey SUA_NOVA_CHAVE_BRONXYS",
        "{prefix}setbronxyskey SUA_NOVA_CHAVE_BRONXYS"
    ],

    async execute(message) {
        const isSuperUser = message.sender?.isOwner || isOwner(message);
        if (!isSuperUser) {
            return await message.reply({
                text: "❌ Apenas superusuários / donos do bot podem alterar a chave de API da Bronxys."
            });
        }

        const newKey = message.args[0]?.trim();
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
                    text: `✅ *Chave de API da Bronxys atualizada e validada com sucesso!*\n\n📊 *Pedidos disponíveis:* ${data.requests ?? 0}\n⚙️ Configuração salva em _settings/bronxys.json_.`
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

            return await message.reply({
                text: "❌ Não foi possível validar a chave com o servidor Bronxys. A chave não foi alterada; tente novamente mais tarde."
            });
        }
    }
};
