const webLinks = require("../../functions/webLinks");

module.exports = {
    name: "gerarlink_perfil",
    aliases: ["gerarlink-perfil", "linkperfil"],
    category: "contas",
    description: "Gera o link web do seu perfil neste grupo ou servidor.",
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
