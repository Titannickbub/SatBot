const webLinks = require("../../functions/webLinks");

module.exports = {
    name: "gerarlink_perfil",
    aliases: ["gerarlink-perfil", "linkperfil"],
    category: "contas",
    description: `🔗 Gera um link para abrir no navegador a página do seu perfil e seus dados neste grupo ou servidor.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}gerarlink_perfil

O bot retorna um link exclusivo que abre a página do seu perfil no painel web. O link exibe seus dados referentes ao grupo ou servidor em que o comando foi usado.

⚠️ O painel web precisa estar configurado. Caso contrário, peça a um superusuário para usar o comando set_dominio.`,
    usage: "{prefix}gerarlink_perfil",

    async execute(message) {
        if (!webLinks.getBaseUrl()) {
            return message.reply({ text: "❌ O painel web ainda não está configurado. Peça a um super usuário para usar set_dominio." });
        }

        const link = webLinks.profile(message);
        if (!link) {
            return message.reply({ text: "❌ Este comando só pode ser usado dentro de um grupo ou servidor." });
        }

        return message.reply({ text: `🔗 Seu perfil neste grupo/servidor:\n${link}` });
    }
};
