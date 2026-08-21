module.exports = {
    name: "gerar_unir",
    description: "Gera um código para unir sua conta com outra conta em outra plataforma",
    usage: "{prefix}gerar_unir",
    async execute(message) {
        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        if (!store) return message.reply({ text: "❌ Sistema de contas centralizadas não está disponível." });

        const central = store.findByPlatform(message.platform, message.userId);
        if (!central) return message.reply({ text: "❌ Nenhuma conta central encontrada para este usuário." });

        try {
            const { code, expiresAt } = await store.generateMergeCode(central.id);
            return message.reply({ text: `✅ Código gerado: ${code}\nExpira em: ${expiresAt}` });
        } catch (err) {
            console.error('gerar_unir error', err);
            return message.reply({ text: '❌ Falha ao gerar código de união.' });
        }
    }
};
