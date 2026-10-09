module.exports = {
    category: "contas/conectar",
    name: "gerar_unir",
    description: `🔗 Gera um código temporário para vincular a conta desta plataforma a uma conta sua em outra plataforma (ex: WhatsApp e Discord).

📝 1. Execute o comando para gerar o código de união:
{prefix}gerar_unir

O bot retorna um código temporário de uso único com prazo de validade.

2. Em seguida, acesse sua conta na outra plataforma e execute:
{prefix}unir <codigo>

Após a confirmação, as duas contas serão conectadas à mesma conta central compartilhando seus dados.`,
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
