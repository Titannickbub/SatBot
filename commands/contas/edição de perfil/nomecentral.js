module.exports = {
    name: "nomecentral",
    aliases: ["centralnome"],
    category: "contas/edição de perfil",
    description: "Altera o nome público da sua conta central, compartilhado entre as plataformas vinculadas. Informe o novo nome após o comando.",
    usage: "{prefix}nomecentral <novo nome>",

    async execute(message) {
        const args = message.args || [];
        const newName = args.join(" ").trim();
        if (!newName) {
            return message.reply({ text: `❌ Uso correto: ${message.prefix}nomecentral <novo nome>` });
        }

        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        if (!store) return message.reply({ text: "❌ Sistema de contas centralizadas não está disponível." });

        const central = store.findByPlatform(message.platform, message.userId);
        if (!central) return message.reply({ text: "❌ Nenhuma conta central encontrada para este usuário." });

        try {
            const updated = await store.updateCentralName(central.id, newName);
            return message.reply({ text: `✅ Nome central atualizado para: ${updated.name}` });
        } catch (err) {
            console.error('nomecentral error', err);
            return message.reply({ text: '❌ Falha ao atualizar o nome da conta central.' });
        }
    }
};
