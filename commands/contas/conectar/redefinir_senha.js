const webLinks = require("../../../functions/webLinks");

module.exports = {
    name: "redefinir_senha",
    aliases: ["definir_login", "configurar_login"],
    category: "contas/conectar",
    description: `🔐 Gera um link temporário para criar ou redefinir o usuário e a senha do dashboard.

Use somente no privado do bot. A senha e o usuário serão definidos diretamente na página, sem serem enviados em uma mensagem ao bot.

Depois, entre no dashboard usando o usuário ou o ID central e a senha que definiu. O link expira em 15 minutos, só pode ser usado uma vez e invalida as credenciais e sessões anteriores.

⚠️ Nunca compartilhe o link: qualquer pessoa que o possuir poderá definir as credenciais da sua Conta Central.`,
    usage: "{prefix}redefinir_senha",
    async execute(message) {
        if (!message.isPrivate) {
            return message.reply({
                text: "❌ Este comando só funciona no privado do bot para proteger o link de configuração. Abra a conversa privada e tente novamente."
            });
        }

        const baseUrl = webLinks.getBaseUrl();
        if (!baseUrl) {
            return message.reply({ text: "❌ O painel web ainda não está configurado. Peça a um super usuário para configurar o domínio do painel." });
        }

        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        if (!store) {
            return message.reply({ text: "❌ Sistema de contas centralizadas não está disponível." });
        }

        const central = store.findByPlatform(message.platform, message.userId);
        if (!central) {
            return message.reply({ text: "❌ Nenhuma Conta Central foi encontrada para este usuário." });
        }

        try {
            const token = await store.createWebCredentialSetupToken(central.id);
            const setupUrl = new URL("/configurar-login", `${baseUrl}/`);
            setupUrl.searchParams.set("token", token);
            await message.reply({
                text: "🔐 Copie a próxima mensagem inteira e cole na barra de endereços do navegador. O link é válido por 15 minutos e só pode ser usado uma vez. Na página, defina seu usuário e senha. Não compartilhe o link: quem o possuir pode alterar as credenciais da sua Conta Central."
            });
            await message.reply({ text: setupUrl.toString() });
            return webLinks.sendHttpBrowserNotice(message, setupUrl.toString());
        } catch (error) {
            console.error("redefinir_senha error", error);
            return message.reply({ text: "❌ Não foi possível criar o link de configuração. Tente novamente." });
        }
    }
};
