const webLinks = require("../../../functions/webLinks");

module.exports = {
    name: "redefinir_senha",
    category: "contas/conectar",
    description: `🔐 Cria ou redefine a senha usada para entrar no dashboard web com o ID da sua Conta Central. Não é preciso informar a senha antiga.

⚠️ Use este comando somente no privado do bot. A senha precisa ser enviada ao bot para ser cadastrada; em grupos, outras pessoas poderiam vê-la no histórico. O bot não processa este comando em grupos.

📝 Envie a nova senha duas vezes, exatamente igual e sem espaços dentro dela. O espaço separa a primeira senha da confirmação:
{prefix}redefinir_senha MinhaSenhaNova123 MinhaSenhaNova123

A senha deve ter pelo menos 8 caracteres. Depois de cadastrá-la, o bot envia seu ID central em uma mensagem separada e um link de login automático, temporário e de uso único. No dashboard, entre com o ID central e a senha que acabou de definir.

🔒 Se o painel usar HTTP, a conexão não criptografa a senha nem o link durante o trajeto entre seu dispositivo e o painel. Escolha uma senha exclusiva para o SatBot; não reutilize senhas de redes sociais, e-mail ou outros serviços. Nunca compartilhe sua senha ou o link de login.`,
    usage: "{prefix}redefinir_senha <nova senha> <nova senha>",
    async execute(message) {
        if (!message.isPrivate) {
            return message.reply({
                text: "❌ Este comando não funciona em grupos para proteger sua senha: a mensagem ficaria visível no histórico para os participantes. Abra o privado do bot e envie o comando lá."
            });
        }

        const baseUrl = webLinks.getBaseUrl();
        if (!baseUrl) {
            return message.reply({ text: "❌ O painel web ainda não está configurado. Peça a um super usuário para configurar o domínio do painel." });
        }
        const args = message.args || [];
        if (args.length !== 2 || !args[0] || !args[1]) {
            return message.reply({
                text: `🔐 Este comando cria ou redefine a senha do dashboard da sua Conta Central; não precisa da senha antiga.\n\nEnvie a nova senha duas vezes, exatamente igual e sem espaços dentro dela. O espaço separa a senha da confirmação:\n${message.prefix}redefinir_senha MinhaSenhaNova123 MinhaSenhaNova123\n\nDepois, o bot enviará seu ID central e um link de login automático temporário. Use uma senha exclusiva para o SatBot, principalmente se o painel estiver em HTTP, e nunca compartilhe a senha ou o link.`
            });
        }

        if (args[0] !== args[1]) {
            return message.reply({ text: "❌ As duas senhas precisam ser iguais." });
        }

        if (args[0].length < 8) {
            return message.reply({ text: "❌ A senha precisa ter pelo menos 8 caracteres." });
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
            await store.setWebPassword(central.id, args[0]);
            const token = await store.createWebLoginToken(central.id);
            const loginUrl = new URL("/autologin", `${baseUrl}/`);
            loginUrl.searchParams.set("token", token);

            await message.reply({ text: `🆔 Seu ID central de login: ${central.id}` });
            await message.reply({ text: `🔐 Sua senha do painel é a senha que você acabou de definir.` });
            const linkMessage = `🔗 Link de login automático (válido por 10 minutos e de uso único):\n${loginUrl.toString()}\n\n⚠️ Nunca compartilhe este link ou sua senha. Qualquer pessoa com o link pode acessar sua conta.`;
            await message.reply({ text: linkMessage });
            return webLinks.sendHttpBrowserNotice(message, loginUrl.toString());
        } catch (error) {
            console.error("redefinir_senha error", error);
            return message.reply({ text: "❌ Não foi possível salvar a senha e criar o link de acesso. Tente novamente." });
        }
    }
};
