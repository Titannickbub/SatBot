const { renderProfile } = require("../../../functions/imageBanner");

module.exports = {
    name: "perfil",
    aliases: ["profile", "minhaconta"],
    category: "contas/exibir",
    description: `👤 Gera uma imagem personalizada do seu perfil com nível, XP, satcoins, NoFap e atividade no grupo ou servidor atual.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}perfil

O bot gera e envia um banner em imagem contendo seus dados e estatísticas no chat atual.

ℹ️ Para visualizar essas informações em formato de texto, utilize o comando {prefix}perfil_text.`,
    usage: "{prefix}perfil",

    async execute(message) {
        const result = await renderProfile(message);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        return message.replyImg({
            image: result.buffer,
            caption: `${result.caption}\n\nℹ️ O antigo modelo em texto está disponível em ${message.prefix}perfil_text.`,
            fileName: "perfil.png"
        });
    }
};
