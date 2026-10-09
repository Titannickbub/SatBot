module.exports = {
    name: "unir",
    category: "contas/conectar",
    description: `🔗 Vincula esta conta à sua conta central utilizando o código temporário gerado pelo comando gerar_unir em outra plataforma.

📝 1. Informe o código de união recebido:
{prefix}unir <codigo>
{prefix}unir ABCD1234

O bot valida o código temporário e conecta as duas contas à mesma conta central, unificando seus dados entre as plataformas.

⚠️ Caso ainda não tenha um código, use o comando {prefix}gerar_unir na sua outra plataforma para gerá-lo.`,
    usage: "{prefix}unir <codigo>",
    async execute(message) {
        const args = message.args || [];
        const code = args[0];
        if (!code) return message.reply({ text: "❌ Use: unir <codigo>" });

        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        if (!store) return message.reply({ text: "❌ Sistema de contas centralizadas não está disponível." });

        const targetCentral = store.findByPlatform(message.platform, message.userId);
        if (!targetCentral) return message.reply({ text: "❌ Nenhuma conta central encontrada para este usuário." });

        try {
            const merged = await store.useMergeCode(code, targetCentral.id);
            return message.reply({ text: `✅ Contas unidas com sucesso. Central resultante: ${merged.id}` });
        } catch (err) {
            console.error('unir error', err);
            const msg = err.message === 'invalid-code' ? 'Código inválido.' : err.message === 'code-expired' ? 'Código expirado.' : err.message.startsWith('conflict-platform') ? 'Conflito entre plataformas ao unir.' : 'Falha ao unir contas.';
            return message.reply({ text: `❌ ${msg}` });
        }
    }
};
